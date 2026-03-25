require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { z } = require('zod');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const PDFDocument = require('pdfkit');
const { RekognitionClient, CompareFacesCommand } = require('@aws-sdk/client-rekognition');
const { generateId, nowIso, initDb, prisma } = require('./db');
const db = require('./models');

const app = express();

// Production-ready CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://attendx.vercel.app', 'https://attendx-web.netlify.app'] // Add your web app domains
    : true, // Allow all origins in development
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Use appropriate logging for environment
const logFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(logFormat));

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const AUTO_REGISTER = process.env.AUTO_REGISTER !== 'false';
const FACE_PROVIDER = process.env.FACE_PROVIDER || 'mock';
const FACE_MATCH_THRESHOLD = Number(process.env.FACE_MATCH_THRESHOLD || 90);
const FACE_VERIFY_TTL = Number(process.env.FACE_VERIFY_TTL || 300);
const LIVENESS_ENABLED = process.env.LIVENESS_ENABLED === 'true';

const awsConfigured =
  FACE_PROVIDER === 'aws' &&
  process.env.AWS_REGION &&
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY;

const faceProvider = awsConfigured ? 'aws' : 'mock';

if (FACE_PROVIDER === 'aws' && !awsConfigured) {
  console.warn('FACE_PROVIDER set to aws, but AWS credentials are missing. Falling back to mock.');
}

const rekognitionClient = awsConfigured
  ? new RekognitionClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    })
  : null;

const loginSchema = z.object({
  role: z.enum(['student', 'lecturer', 'kiosk']),
  identifier: z.string().min(2),
  password: z.string().min(6),
  name: z.string().optional(),
});

const registerSchema = z.object({
  role: z.enum(['student', 'lecturer', 'kiosk']),
  identifier: z.string().min(2),
  password: z.string().min(6),
  name: z.string().optional(),
});

const sessionSchema = z.object({
  courseCode: z.string().min(2),
  courseTitle: z.string().min(2),
  room: z.string().min(2),
  startTime: z.string().min(2),
  endTime: z.string().min(2),
  expectedCount: z.number().int().nonnegative(),
  faceRequired: z.boolean(),
  qrRotationSeconds: z.number().int().positive().default(10),
});

const checkinSchema = z.object({
  token: z.string().min(6),
  studentId: z.string().min(2),
  method: z.enum(['qr']).default('qr'),
  verificationId: z.string().optional(),
});

const kioskSchema = z.object({
  sessionId: z.string().min(2),
  studentId: z.string().min(2),
  operatorId: z.string().min(2),
});

const faceSchema = z.object({
  studentId: z.string().min(2),
  imageBase64: z.string().min(20),
  livenessImageBase64: z.string().min(20).optional(),
  challenge: z.string().optional(),
});

function stripBase64(data) {
  return data.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
}

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function getAuthToken(req) {
  const header = req.headers.authorization;
  if (!header) return null;
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) return null;
  return token;
}

async function requireAuth(req, res, next) {
  const token = getAuthToken(req);
  if (!token) return res.status(401).json({ error: 'Missing auth token' });
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid auth token' });
  }
  const user = await db.users.findById(payload.sub);
  if (!user) return res.status(401).json({ error: 'User not found' });
  req.user = user;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

function withSessionDetails(record) {
  return {
    ...record,
    session: record.session ? {
      id: record.session.id,
      courseCode: record.session.courseCode,
      courseTitle: record.session.courseTitle,
      room: record.session.room,
      startTime: record.session.startTime,
      endTime: record.session.endTime,
    } : null,
  };
}

function formatSession(session) {
  if (!session) return null;
  return {
    id: session.id,
    courseCode: session.courseCode,
    courseTitle: session.courseTitle,
    room: session.room,
    startTime: session.startTime,
    endTime: session.endTime,
    expectedCount: session.expectedCount,
    faceRequired: session.faceRequired,
    qrRotationSeconds: session.qrRotationSeconds,
    status: session.status,
    checkedIn: session.checkedIn,
    fallbackCount: session.fallbackCount,
    createdAt: session.createdAt,
    endedAt: session.endedAt,
  };
}

function formatAttendance(record) {
  return {
    id: record.id,
    sessionId: record.sessionId,
    studentId: record.studentId,
    method: record.method,
    status: record.status,
    operatorId: record.operatorId,
    createdAt: record.createdAt,
    session: record.session ? formatSession(record.session) : null,
  };
}

async function compareFacesAws(sourceBase64, targetBase64) {
  if (!rekognitionClient) {
    return { verified: false, similarity: 0, provider: 'mock' };
  }
  const command = new CompareFacesCommand({
    SourceImage: { Bytes: Buffer.from(stripBase64(sourceBase64), 'base64') },
    TargetImage: { Bytes: Buffer.from(stripBase64(targetBase64), 'base64') },
    SimilarityThreshold: FACE_MATCH_THRESHOLD,
  });
  const response = await rekognitionClient.send(command);
  const match = response.FaceMatches?.[0];
  const similarity = match?.Similarity || 0;
  return { verified: similarity >= FACE_MATCH_THRESHOLD, similarity, provider: 'aws' };
}

async function compareFaces(sourceBase64, targetBase64) {
  if (faceProvider === 'aws') {
    return compareFacesAws(sourceBase64, targetBase64);
  }
  return { verified: true, similarity: 99, provider: 'mock' };
}

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', time: nowIso(), database: 'connected' });
  } catch (err) {
    res.json({ status: 'ok', time: nowIso(), database: 'disconnected' });
  }
});

// Keep-alive endpoint to prevent Render from sleeping
app.get('/ping', (req, res) => {
  res.json({ 
    status: 'alive', 
    time: nowIso(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

app.post('/auth/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }
  const { role, identifier, password, name } = parsed.data;

  const existing = await db.users.findByRoleAndIdentifier(role, identifier);
  if (existing) {
    return res.status(409).json({ error: 'User already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await db.users.create({
    id: generateId('user'),
    role,
    identifier,
    name: name || identifier,
    passwordHash,
    createdAt: nowIso(),
  });

  const token = signToken(user);
  res.json({
    user: {
      id: user.id,
      role: user.role,
      name: user.name,
      identifier: user.identifier,
    },
    token,
  });
});

app.post('/auth/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }
  const { role, identifier, password, name } = parsed.data;

  let user = await db.users.findByRoleAndIdentifier(role, identifier);
  if (!user) {
    if (!AUTO_REGISTER) {
      return res.status(404).json({ error: 'User not found. Register first.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    user = await db.users.create({
      id: generateId('user'),
      role,
      identifier,
      name: name || identifier,
      passwordHash,
      createdAt: nowIso(),
    });
  }

  if (!user.passwordHash) {
    const passwordHash = await bcrypt.hash(password, 10);
    user = await db.users.updatePasswordHash(user.id, passwordHash);
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signToken(user);
  res.json({
    user: {
      id: user.id,
      role: user.role,
      name: user.name,
      identifier: user.identifier,
    },
    token,
  });
});

app.post('/sessions/start', requireAuth, requireRole('lecturer'), async (req, res) => {
  const parsed = sessionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }
  const payload = parsed.data;

  const session = await db.sessions.create({
    id: generateId('session'),
    ...payload,
    status: 'live',
    checkedIn: 0,
    fallbackCount: 0,
    createdAt: nowIso(),
  });
  res.json(formatSession(session));
});

app.post('/sessions/:id/end', requireAuth, requireRole('lecturer'), async (req, res) => {
  const session = await db.sessions.findById(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const updated = await db.sessions.updateStatus(req.params.id, 'ended');
  res.json(formatSession(updated));
});

app.get('/sessions/active', requireAuth, async (req, res) => {
  const session = await db.sessions.findActive();
  res.json(session ? formatSession(session) : null);
});

app.get('/sessions', requireAuth, requireRole('lecturer'), async (req, res) => {
  const sessions = await db.sessions.findAll();
  res.json(sessions.map(formatSession));
});

app.get('/sessions/:id', requireAuth, requireRole('lecturer'), async (req, res) => {
  const session = await db.sessions.findById(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(formatSession(session));
});

app.post('/sessions/:id/token', requireAuth, requireRole('lecturer'), async (req, res) => {
  const session = await db.sessions.findById(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const rotationSeconds = session.qrRotationSeconds || 10;
  const token = generateId('qr');
  const expiresAt = Date.now() + rotationSeconds * 1000;

  await db.qrTokens.create({
    id: generateId('qr_token'),
    sessionId: session.id,
    token,
    expiresAt,
    createdAt: nowIso(),
  });

  await db.qrTokens.deleteExpired();

  res.json({ token, expiresAt });
});

app.post('/sessions/validate', requireAuth, async (req, res) => {
  const token = req.body?.token;
  if (!token) return res.status(400).json({ error: 'Token required' });
  const found = await db.qrTokens.findByToken(token);
  if (!found) return res.status(400).json({ error: 'Token invalid or expired' });
  res.json({ valid: true, sessionId: found.sessionId, expiresAt: Number(found.expiresAt) });
});

app.post('/face/enroll', requireAuth, async (req, res) => {
  const parsed = faceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }
  const { studentId, imageBase64 } = parsed.data;
  if (req.user.role === 'student' && req.user.id !== studentId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const existing = await db.faceProfiles.findByStudentId(studentId);
  if (existing) {
    await db.faceProfiles.update(studentId, stripBase64(imageBase64));
    return res.json({ status: 'updated' });
  }

  await db.faceProfiles.create({
    id: generateId('face_profile'),
    studentId,
    imageBase64: stripBase64(imageBase64),
    provider: faceProvider,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  res.json({ status: 'enrolled' });
});

app.post('/face/verify', requireAuth, async (req, res) => {
  const parsed = faceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }
  const { studentId, imageBase64, livenessImageBase64, challenge } = parsed.data;
  if (req.user.role === 'student' && req.user.id !== studentId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await db.faceVerifications.deleteExpired();
  const profile = await db.faceProfiles.findByStudentId(studentId);
  if (!profile) {
    return res.status(404).json({ error: 'Face not enrolled' });
  }

  if (LIVENESS_ENABLED && !livenessImageBase64) {
    return res.status(400).json({ error: 'Liveness image required' });
  }

  try {
    const result = await compareFaces(imageBase64, profile.imageBase64);
    if (!result.verified) {
      return res.json({ verified: false, similarity: result.similarity, provider: result.provider });
    }

    if (LIVENESS_ENABLED && livenessImageBase64) {
      const primary = stripBase64(imageBase64);
      const live = stripBase64(livenessImageBase64);
      if (primary === live) {
        return res.status(400).json({ error: 'Liveness check failed' });
      }
      const liveResult = await compareFaces(imageBase64, livenessImageBase64);
      if (!liveResult.verified) {
        return res.status(400).json({ error: 'Liveness check failed' });
      }
    }

    const verificationId = generateId('face_verify');
    await db.faceVerifications.create({
      id: verificationId,
      studentId,
      similarity: result.similarity,
      provider: result.provider,
      challenge: challenge || null,
      liveness: LIVENESS_ENABLED,
      createdAt: nowIso(),
      expiresAt: Date.now() + FACE_VERIFY_TTL * 1000,
    });

    res.json({
      verified: true,
      similarity: result.similarity,
      provider: result.provider,
      verificationId,
    });
  } catch (err) {
    res.status(500).json({ error: 'Face verification failed' });
  }
});

app.post('/attendance/checkin', requireAuth, requireRole('student'), async (req, res) => {
  const parsed = checkinSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }
  const { token, studentId, method, verificationId } = parsed.data;
  if (req.user.id !== studentId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await db.faceVerifications.deleteExpired();
  const tokenEntry = await db.qrTokens.findByToken(token);
  if (!tokenEntry) return res.status(400).json({ error: 'Token invalid or expired' });
  const session = await db.sessions.findById(tokenEntry.sessionId);
  if (!session || session.status !== 'live') {
    return res.status(400).json({ error: 'Session not active' });
  }

  if (session.faceRequired) {
    if (!verificationId) {
      return res.status(400).json({ error: 'Face verification required' });
    }
    const verification = await db.faceVerifications.findValid(studentId, verificationId);
    if (!verification) {
      return res.status(400).json({ error: 'Face verification expired or invalid' });
    }
    await db.faceVerifications.delete(verificationId);
  }

  const existing = await db.attendance.findBySessionAndStudent(session.id, studentId);
  if (existing) return res.status(409).json({ error: 'Already checked in' });

  const record = await db.attendance.create({
    id: generateId('attendance'),
    sessionId: session.id,
    studentId,
    method,
    status: 'Present',
    createdAt: nowIso(),
  });
  await db.sessions.incrementCheckedIn(session.id);

  res.json({ record: formatAttendance(record), session: formatSession(session) });
});

app.post('/attendance/kiosk', requireAuth, requireRole('kiosk', 'lecturer'), async (req, res) => {
  const parsed = kioskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }
  const { sessionId, studentId, operatorId } = parsed.data;
  const session = await db.sessions.findById(sessionId);
  if (!session || session.status !== 'live') {
    return res.status(400).json({ error: 'Session not active' });
  }

  const existing = await db.attendance.findBySessionAndStudent(session.id, studentId);
  if (existing) return res.status(409).json({ error: 'Already checked in' });

  const record = await db.attendance.create({
    id: generateId('attendance'),
    sessionId: session.id,
    studentId,
    method: 'kiosk',
    status: 'Present',
    operatorId,
    createdAt: nowIso(),
  });
  await db.sessions.incrementFallbackCount(session.id);

  res.json({ record: formatAttendance(record), session: formatSession(session) });
});

app.get('/attendance/session/:id', requireAuth, requireRole('lecturer'), async (req, res) => {
  const session = await db.sessions.findById(req.params.id);
  const list = await db.attendance.findBySession(req.params.id);
  const records = list.map(r => formatAttendance({ ...r, session }));
  res.json(records);
});

app.get('/attendance/student/:id', requireAuth, async (req, res) => {
  if (req.user.role === 'student' && req.user.id !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const list = await db.attendance.findByStudent(req.params.id);
  res.json(list);
});

app.get('/reports/summary', requireAuth, requireRole('lecturer'), async (req, res) => {
  const sessionId = req.query.sessionId;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
  const session = await db.sessions.findById(sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const records = await db.attendance.findBySession(sessionId);
  const total = records.length;
  const fallback = records.filter(a => a.method === 'kiosk').length;
  res.json({
    sessionId,
    total,
    fallback,
    expected: session.expectedCount,
    checkedIn: session.checkedIn,
  });
});

app.get('/reports/attendance', requireAuth, requireRole('lecturer'), async (req, res) => {
  const list = await db.attendance.filter(req.query);
  const formatted = list.map(formatAttendance);
  res.json(formatted);
});

app.get('/reports/export', requireAuth, requireRole('lecturer'), async (req, res) => {
  const format = (req.query.format || 'csv').toString().toLowerCase();
  const list = await db.attendance.filter(req.query);

  if (format === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance.pdf"');
    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);
    doc.fontSize(18).text('AttendX Attendance Report', { align: 'left' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated: ${nowIso()}`);
    doc.moveDown();

    list.forEach((record, index) => {
      doc
        .fontSize(11)
        .text(
          `${index + 1}. ${record.studentId} | ${record.session?.courseCode || ''} ${record.session?.courseTitle || ''} | ${record.status} | ${record.method} | ${record.createdAt}`
        );
    });

    doc.end();
    return;
  }

  const header = ['studentId', 'courseCode', 'courseTitle', 'status', 'method', 'createdAt'];
  const rows = list.map((record) => [
    record.studentId,
    record.session?.courseCode || '',
    record.session?.courseTitle || '',
    record.status,
    record.method,
    record.createdAt,
  ]);
  const csv = [header, ...rows].map((row) => row.join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="attendance.csv"');
  res.send(csv);
});

app.get('/reports/active', requireAuth, requireRole('lecturer'), async (req, res) => {
  const session = await db.sessions.findActive();
  if (!session) return res.json(null);
  const records = await db.attendance.findBySession(session.id);
  const total = records.length;
  const fallback = records.filter(a => a.method === 'kiosk').length;
  res.json({
    session: formatSession(session),
    total,
    fallback,
  });
});

async function startServer() {
  try {
    await initDb();
  } catch (err) {
    console.error('Failed to connect to database:', err.message);
  }

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`AttendX API running on http://localhost:${PORT}`);
  });
}

startServer();

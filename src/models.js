const { prisma } = require('./db');

const users = {
  async findByRoleAndIdentifier(role, identifier) {
    return prisma.user.findUnique({
      where: { role_identifier: { role, identifier } },
    });
  },

  async findById(id) {
    return prisma.user.findUnique({ where: { id } });
  },

  async create(user) {
    return prisma.user.create({
      data: {
        id: user.id,
        role: user.role,
        identifier: user.identifier,
        name: user.name,
        passwordHash: user.passwordHash,
        createdAt: user.createdAt,
      },
    });
  },

  async updatePasswordHash(id, passwordHash) {
    return prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  },
};

const sessions = {
  async findById(id) {
    return prisma.session.findUnique({ where: { id } });
  },

  async findAll() {
    return prisma.session.findMany({ orderBy: { createdAt: 'desc' } });
  },

  async findActive() {
    return prisma.session.findFirst({
      where: { status: 'live' },
      orderBy: { createdAt: 'desc' },
    });
  },

  async create(session) {
    return prisma.session.create({
      data: {
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
      },
    });
  },

  async updateStatus(id, status) {
    const endedAt = status === 'ended' ? new Date() : null;
    return prisma.session.update({
      where: { id },
      data: { status, endedAt },
    });
  },

  async incrementCheckedIn(id) {
    return prisma.session.update({
      where: { id },
      data: { checkedIn: { increment: 1 } },
    });
  },

  async incrementFallbackCount(id) {
    return prisma.session.update({
      where: { id },
      data: { fallbackCount: { increment: 1 } },
    });
  },
};

const qrTokens = {
  async create(token) {
    return prisma.qrToken.create({
      data: {
        id: token.id,
        sessionId: token.sessionId,
        token: token.token,
        expiresAt: BigInt(token.expiresAt),
        createdAt: token.createdAt,
      },
    });
  },

  async findByToken(token) {
    const now = BigInt(Date.now());
    const result = await prisma.qrToken.findFirst({
      where: { token, expiresAt: { gt: now } },
    });
    return result;
  },

  async deleteExpired() {
    const now = BigInt(Date.now() - 1000);
    return prisma.qrToken.deleteMany({
      where: { expiresAt: { lt: now } },
    });
  },
};

const attendance = {
  async findBySession(sessionId) {
    return prisma.attendance.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  },

  async findByStudent(studentId) {
    return prisma.attendance.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findBySessionAndStudent(sessionId, studentId) {
    return prisma.attendance.findUnique({
      where: { sessionId_studentId: { sessionId, studentId } },
    });
  },

  async create(record) {
    return prisma.attendance.create({
      data: {
        id: record.id,
        sessionId: record.sessionId,
        studentId: record.studentId,
        method: record.method,
        status: record.status,
        operatorId: record.operatorId,
        createdAt: record.createdAt,
      },
    });
  },

  async filter(filters) {
    const where = {};
    
    if (filters.sessionId) where.sessionId = filters.sessionId;
    if (filters.studentId) where.studentId = filters.studentId;
    if (filters.method) where.method = filters.method;
    if (filters.status) where.status = filters.status;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

    const records = await prisma.attendance.findMany({
      where,
      include: { session: true },
      orderBy: { createdAt: 'desc' },
    });

    if (filters.courseCode) {
      return records.filter(r => r.session?.courseCode === filters.courseCode);
    }
    
    return records;
  },
};

const faceProfiles = {
  async findByStudentId(studentId) {
    return prisma.faceProfile.findUnique({
      where: { studentId },
    });
  },

  async create(profile) {
    return prisma.faceProfile.create({
      data: {
        id: profile.id,
        studentId: profile.studentId,
        imageBase64: profile.imageBase64,
        provider: profile.provider,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
    });
  },

  async update(studentId, imageBase64) {
    return prisma.faceProfile.update({
      where: { studentId },
      data: { imageBase64, updatedAt: new Date() },
    });
  },
};

const faceVerifications = {
  async create(verification) {
    return prisma.faceVerification.create({
      data: {
        id: verification.id,
        studentId: verification.studentId,
        similarity: verification.similarity,
        provider: verification.provider,
        challenge: verification.challenge,
        liveness: verification.liveness,
        createdAt: verification.createdAt,
        expiresAt: BigInt(verification.expiresAt),
      },
    });
  },

  async findValid(studentId, verificationId) {
    const now = BigInt(Date.now());
    return prisma.faceVerification.findFirst({
      where: {
        id: verificationId,
        studentId,
        expiresAt: { gt: now },
      },
    });
  },

  async deleteExpired() {
    const now = BigInt(Date.now());
    return prisma.faceVerification.deleteMany({
      where: { expiresAt: { lt: now } },
    });
  },

  async delete(verificationId) {
    return prisma.faceVerification.delete({
      where: { id: verificationId },
    });
  },
};

module.exports = {
  users,
  sessions,
  qrTokens,
  attendance,
  faceProfiles,
  faceVerifications,
};

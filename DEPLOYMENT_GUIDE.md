# AttendX API Deployment Guide

## Overview
This guide will help you deploy the AttendX backend APIs with Neon PostgreSQL database so students and lecturers can register and use the app.

## Current Status
- ✅ Server code complete with all endpoints
- ✅ Prisma schema configured for PostgreSQL
- ⏳ Database connection needs setup
- ⏳ Server deployment needed

## Quick Setup (5 minutes)

### 1. Create Neon Database
```bash
# Run the setup helper
node setup-neon.js
```

Or manually:
1. Go to [https://console.neon.tech](https://console.neon.tech)
2. Create account/sign in
3. Click "New Project"
4. Name: `attendx-production`
5. Click "Create Project"
6. Click "Connect" → Copy connection string

### 2. Update Environment
```bash
# Edit server/.env
DATABASE_URL="your_neon_connection_string_here"
```

### 3. Initialize Database
```bash
cd server
npm install
npx prisma generate
npx prisma db push
```

### 4. Start Server
```bash
npm run dev
```

### 5. Test Connection
```bash
curl http://localhost:4000/health
# Should return: {"status":"ok","database":"connected"}
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user

### Sessions (Lecturers)
- `POST /sessions/start` - Start attendance session
- `POST /sessions/:id/end` - End session
- `GET /sessions/active` - Get active session
- `GET /sessions` - List all sessions
- `POST /sessions/:id/token` - Generate QR token

### Attendance (Students)
- `POST /sessions/validate` - Validate QR token
- `POST /attendance/checkin` - Check in to session
- `GET /attendance/student/:id` - Get student attendance

### Face Recognition
- `POST /face/enroll` - Enroll face profile
- `POST /face/verify` - Verify face for attendance

### Reports (Lecturers)
- `GET /reports/summary` - Session summary
- `GET /reports/attendance` - Attendance records
- `GET /reports/export` - Export CSV/PDF

### Kiosk Mode
- `POST /attendance/kiosk` - Manual check-in

## Database Schema

The system uses these main tables:
- **users** - Students, lecturers, kiosk operators
- **sessions** - Attendance sessions
- **qr_tokens** - Rotating QR codes
- **attendance** - Check-in records
- **face_profiles** - Face recognition data
- **face_verifications** - Temporary face verifications

## Testing the APIs

### 1. Register a Lecturer
```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "role": "lecturer",
    "identifier": "prof.smith",
    "password": "password123",
    "name": "Professor Smith"
  }'
```

### 2. Register a Student
```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "role": "student",
    "identifier": "student001",
    "password": "password123",
    "name": "John Doe"
  }'
```

### 3. Start a Session (as lecturer)
```bash
# First login to get token
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "role": "lecturer",
    "identifier": "prof.smith",
    "password": "password123"
  }'

# Use the token to start session
curl -X POST http://localhost:4000/sessions/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "courseCode": "EDU401",
    "courseTitle": "Curriculum & Instruction",
    "room": "LT1",
    "startTime": "09:00",
    "endTime": "11:00",
    "expectedCount": 50,
    "faceRequired": false,
    "qrRotationSeconds": 10
  }'
```

## Production Deployment Options

### Option 1: Railway (Recommended)
1. Connect GitHub repo to Railway
2. Add environment variables
3. Deploy automatically

### Option 2: Render
1. Connect GitHub repo
2. Set build command: `cd server && npm install`
3. Set start command: `cd server && npm start`

### Option 3: Vercel (Serverless)
1. Add `vercel.json` configuration
2. Deploy with Vercel CLI

### Option 4: DigitalOcean App Platform
1. Connect GitHub repo
2. Configure build settings
3. Add environment variables

## Environment Variables for Production

```env
DATABASE_URL=your_neon_production_url
PORT=4000
JWT_SECRET=your_super_secure_jwt_secret
JWT_EXPIRES_IN=7d
AUTO_REGISTER=true
FACE_PROVIDER=mock
FACE_MATCH_THRESHOLD=90
FACE_VERIFY_TTL=300
LIVENESS_ENABLED=false
```

## Mobile App Configuration

Update the API URL in the mobile app:

```typescript
// mobile/src/services/api.ts
const API_BASE_URL = 'https://your-deployed-api.com';
```

## Security Considerations

1. **JWT Secret**: Use a strong, random JWT secret
2. **HTTPS**: Always use HTTPS in production
3. **CORS**: Configure CORS for your frontend domains
4. **Rate Limiting**: Consider adding rate limiting
5. **Input Validation**: All inputs are validated with Zod

## Monitoring and Logging

- Health check endpoint: `/health`
- Morgan logging enabled for requests
- Database connection status in health check
- Consider adding error tracking (Sentry)

## Backup Strategy

- Neon provides automatic backups
- Consider additional backup strategies for critical data
- Test restore procedures regularly

## Performance Optimization

1. **Connection Pooling**: Use Neon's pooled connections
2. **Caching**: Consider Redis for session data
3. **CDN**: Use CDN for static assets
4. **Database Indexing**: Optimize queries with indexes

## Troubleshooting

### Database Connection Issues
- Verify connection string format
- Check Neon project status
- Ensure SSL is enabled

### Authentication Problems
- Check JWT secret configuration
- Verify token expiration settings
- Test with curl commands

### Face Recognition Issues
- Currently using mock provider
- For production, configure AWS Rekognition
- Test with sample images

## Next Steps

1. ✅ Set up Neon database
2. ✅ Test APIs locally
3. 🔄 Deploy to production platform
4. 🔄 Update mobile app API URL
5. 🔄 Test end-to-end flow
6. 🔄 Set up monitoring and alerts

## Support

For issues:
- Check server logs
- Test individual endpoints
- Verify database connection
- Review environment variables
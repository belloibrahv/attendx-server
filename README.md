# AttendX Server API

Backend API for AttendX - TASUED Smart Attendance System

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (Neon recommended)

### Installation
```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

### Environment Variables
Create a `.env` file:
```env
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
JWT_SECRET=your_secure_jwt_secret
JWT_EXPIRES_IN=7d
AUTO_REGISTER=true
FACE_PROVIDER=mock
FACE_MATCH_THRESHOLD=90
FACE_VERIFY_TTL=300
LIVENESS_ENABLED=false
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

## 📡 API Endpoints

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

## 🗄️ Database Schema

- **users** - Students, lecturers, kiosk operators
- **sessions** - Attendance sessions
- **qr_tokens** - Rotating QR codes
- **attendance** - Check-in records
- **face_profiles** - Face recognition data
- **face_verifications** - Temporary face verifications

## 🚀 Deployment

### Railway
1. Connect this repository to Railway
2. Add environment variables
3. Deploy automatically

### Render
1. Connect repository to Render
2. Build command: `npm install && npx prisma generate`
3. Start command: `npm start`

### Vercel
```bash
npm install -g vercel
vercel --prod
```

## 🧪 Testing

### Health Check
```bash
curl http://localhost:4000/health
```

### Register User
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

## 🔒 Security Features

- JWT Authentication
- Password hashing with bcrypt
- Input validation with Zod
- CORS enabled
- SSL/TLS support

## 📊 Features

- **Auto Registration**: Users can register automatically
- **QR Code Generation**: Rotating tokens for secure check-ins
- **Face Recognition**: Optional biometric verification
- **Real-time Sessions**: Live attendance tracking
- **Multiple Check-in Methods**: QR codes and kiosk mode
- **Report Generation**: CSV and PDF exports
- **Role-based Access**: Student, lecturer, and kiosk roles

## 🏫 TASUED Integration

Built specifically for Tai Solarin University of Education (TASUED) with:
- Academic session management
- Course code integration
- Lecturer and student role separation
- Attendance reporting for academic records

## 📞 Support

For technical support or questions about the AttendX system, please contact the development team.

## 📄 License

This project is developed for TASUED internal use.
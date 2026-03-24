# AttendX Server Deployment Guide

## 🚀 Deploy to Production Platforms

### Railway (Recommended)

1. **Connect Repository**:
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select `attendx-server` repository

2. **Configure Environment Variables**:
   ```env
   DATABASE_URL=your_neon_database_url
   JWT_SECRET=your_secure_jwt_secret
   AUTO_REGISTER=true
   FACE_PROVIDER=mock
   ```

3. **Deploy**:
   - Railway will automatically detect Node.js
   - Build command: `npm install && npx prisma generate`
   - Start command: `npm start`
   - Deploy automatically on push

### Render

1. **Create Web Service**:
   - Go to [render.com](https://render.com)
   - Click "New" → "Web Service"
   - Connect `attendx-server` repository

2. **Configure Build**:
   - Build Command: `npm install && npx prisma generate`
   - Start Command: `npm start`
   - Environment: Node

3. **Environment Variables**:
   ```env
   DATABASE_URL=your_neon_database_url
   JWT_SECRET=your_secure_jwt_secret
   NODE_ENV=production
   AUTO_REGISTER=true
   FACE_PROVIDER=mock
   ```

### Vercel

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel --prod
   ```

3. **Configure Environment Variables**:
   - Add via Vercel dashboard or CLI
   - Include all required environment variables

### DigitalOcean App Platform

1. **Create App**:
   - Go to DigitalOcean App Platform
   - Connect GitHub repository
   - Select `attendx-server`

2. **Configure**:
   - Build Command: `npm install && npx prisma generate`
   - Run Command: `npm start`
   - Environment Variables: Add all required vars

## 🔧 Environment Variables

Required for all platforms:

```env
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
JWT_SECRET=your_super_secure_secret_here
PORT=4000
AUTO_REGISTER=true
FACE_PROVIDER=mock
FACE_MATCH_THRESHOLD=90
FACE_VERIFY_TTL=300
LIVENESS_ENABLED=false
```

## 🧪 Testing Deployment

After deployment, test these endpoints:

### Health Check
```bash
curl https://your-deployed-url.com/health
```

### Register Test User
```bash
curl -X POST https://your-deployed-url.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "role": "student",
    "identifier": "test001",
    "password": "password123",
    "name": "Test User"
  }'
```

## 📱 Update Mobile App

After deployment, update the mobile app API URL:

```typescript
// mobile/src/services/api.ts
const API_URL = 'https://your-deployed-url.com';
```

## 🔒 Security Checklist

- [ ] Strong JWT secret (32+ characters)
- [ ] HTTPS enabled (automatic on most platforms)
- [ ] Environment variables secured
- [ ] Database connection encrypted
- [ ] CORS configured for your domains
- [ ] Rate limiting considered (optional)

## 📊 Monitoring

### Health Endpoint
- URL: `/health`
- Returns: Server status and database connection

### Logging
- Morgan middleware for request logging
- Console logs for errors
- Consider adding error tracking (Sentry)

## 🔄 CI/CD

The deployment is configured for automatic deployment on push to main branch.

### Manual Deployment
```bash
git push origin main
```

### Database Migrations
```bash
# Run after schema changes
npx prisma db push
```

## 🆘 Troubleshooting

### Database Connection Issues
- Verify DATABASE_URL format
- Check Neon database status
- Ensure SSL is enabled

### Build Failures
- Check Node.js version (18+)
- Verify all dependencies in package.json
- Check build logs for specific errors

### Runtime Errors
- Check environment variables
- Verify JWT_SECRET is set
- Check database connectivity

## 📞 Support

For deployment issues:
1. Check platform-specific logs
2. Verify environment variables
3. Test database connection
4. Check health endpoint

## 🎯 Production Checklist

- [ ] Database deployed and accessible
- [ ] Environment variables configured
- [ ] Health endpoint responding
- [ ] Test user registration works
- [ ] Test session creation works
- [ ] Mobile app updated with new API URL
- [ ] Monitoring and alerts configured
- [ ] Backup strategy in place
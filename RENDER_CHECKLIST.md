# AttendX Server - Render Deployment Checklist

## ✅ Pre-Deployment (Complete)

- [x] Code optimized for Render
- [x] Production CORS configuration
- [x] Keep-alive endpoint added (`/ping`)
- [x] Environment-specific logging
- [x] Render.yaml configuration
- [x] Deployment verification script
- [x] Code pushed to GitHub

## 🚀 Render Deployment Steps

### 1. Create Render Service
- [ ] Go to [render.com](https://render.com)
- [ ] Click "New +" → "Web Service"
- [ ] Connect repository: `https://github.com/belloibrahv/attendx-server`

### 2. Configure Service
- [ ] **Name**: `attendx-api`
- [ ] **Environment**: `Node`
- [ ] **Build Command**: `npm install && npx prisma generate`
- [ ] **Start Command**: `npm start`
- [ ] **Health Check Path**: `/health`

### 3. Environment Variables
Add these in Render dashboard:

```env
DATABASE_URL=postgresql://neondb_owner:npg_G7FOg8yzTSHI@ep-young-king-an2jk0vn-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
JWT_SECRET=attendx_super_secure_jwt_secret_2024_tasued
NODE_ENV=production
AUTO_REGISTER=true
FACE_PROVIDER=mock
FACE_MATCH_THRESHOLD=90
FACE_VERIFY_TTL=300
LIVENESS_ENABLED=false
```

### 4. Deploy
- [ ] Click "Create Web Service"
- [ ] Wait for deployment (2-3 minutes)
- [ ] Note your URL: `https://attendx-api-xxxx.onrender.com`

## 🧪 Post-Deployment Testing

### Automated Verification
```bash
node verify-deployment.js https://your-app-name.onrender.com
```

### Manual Tests
- [ ] Health check: `GET /health`
- [ ] Ping endpoint: `GET /ping`
- [ ] User registration: `POST /auth/register`
- [ ] User login: `POST /auth/login`

### Expected Responses

**Health Check:**
```json
{"status":"ok","time":"2026-03-25T...","database":"connected"}
```

**User Registration:**
```json
{
  "user": {"id":"user_...","role":"student","name":"Test User"},
  "token":"eyJ..."
}
```

## 📱 Update Mobile App

After successful deployment:

1. **Copy Render URL**: `https://attendx-api-xxxx.onrender.com`
2. **Update mobile app**:
   ```typescript
   // mobile/src/services/api.ts
   const API_URL = 'https://attendx-api-xxxx.onrender.com';
   ```
3. **Test mobile app** with new API URL

## 🔧 Render-Specific Features

### Automatic Features
- [x] **Auto-deploy** on git push
- [x] **Health checks** configured
- [x] **HTTPS** enabled automatically
- [x] **Environment variables** secured

### Monitoring
- [ ] Check deployment logs in Render dashboard
- [ ] Monitor response times and uptime
- [ ] Set up external monitoring if needed

## 🚨 Troubleshooting

### Common Issues
- **Build fails**: Check Node.js version and dependencies
- **Database connection**: Verify DATABASE_URL format
- **Environment variables**: Ensure all required vars are set
- **Cold starts**: First request may be slow (free tier)

### Debug Commands
```bash
# Check deployment logs in Render dashboard
# Test specific endpoints
curl https://your-app-name.onrender.com/health
curl https://your-app-name.onrender.com/ping
```

## ✅ Success Criteria

- [ ] Service deploys without errors
- [ ] Health endpoint returns `database: "connected"`
- [ ] User registration works
- [ ] User login works
- [ ] Mobile app connects successfully
- [ ] All API endpoints respond correctly

## 🎯 Production Ready

Once all items are checked:
- [ ] Share API URL with team
- [ ] Update documentation
- [ ] Test complete attendance flow
- [ ] Monitor for 24 hours
- [ ] Plan for scaling if needed

## 📞 Support

If you encounter issues:
1. Check Render deployment logs
2. Verify environment variables
3. Test database connection
4. Run verification script
5. Check GitHub repository for latest code

**Your AttendX API will be live at**: `https://attendx-api-xxxx.onrender.com` 🚀

## 🔄 Future Updates

To update the deployed service:
```bash
git add .
git commit -m "Update: description"
git push origin main
# Render auto-deploys
```
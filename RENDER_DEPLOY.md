# Deploy AttendX Server to Render

## 🚀 Quick Deployment Steps

### 1. Connect Repository to Render

1. **Go to [render.com](https://render.com)**
2. **Sign up/Login** with GitHub account
3. **Click "New +"** → **"Web Service"**
4. **Connect Repository**: `https://github.com/belloibrahv/attendx-server`
5. **Click "Connect"**

### 2. Configure Service Settings

**Basic Settings:**
- **Name**: `attendx-api` (or your preferred name)
- **Environment**: `Node`
- **Region**: Choose closest to your users
- **Branch**: `main`

**Build & Deploy:**
- **Build Command**: `npm install && npx prisma generate`
- **Start Command**: `npm start`

### 3. Environment Variables

Add these environment variables in Render dashboard:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `postgresql://neondb_owner:npg_G7FOg8yzTSHI@ep-young-king-an2jk0vn-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require` |
| `JWT_SECRET` | `attendx_super_secure_jwt_secret_2024_tasued` |
| `NODE_ENV` | `production` |
| `AUTO_REGISTER` | `true` |
| `FACE_PROVIDER` | `mock` |
| `FACE_MATCH_THRESHOLD` | `90` |
| `FACE_VERIFY_TTL` | `300` |
| `LIVENESS_ENABLED` | `false` |

### 4. Advanced Settings

- **Auto-Deploy**: `Yes` (deploys on every push to main)
- **Health Check Path**: `/health`

### 5. Deploy

1. **Click "Create Web Service"**
2. **Wait for deployment** (usually 2-3 minutes)
3. **Get your URL**: `https://attendx-api-xxxx.onrender.com`

## 🧪 Test Deployment

After deployment, test these endpoints:

### Health Check
```bash
curl https://your-app-name.onrender.com/health
```
Expected response:
```json
{"status":"ok","time":"2026-03-25T...","database":"connected"}
```

### Register Test User
```bash
curl -X POST https://your-app-name.onrender.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "role": "student",
    "identifier": "test001",
    "password": "password123",
    "name": "Test Student"
  }'
```

Expected response:
```json
{
  "user": {
    "id": "user_...",
    "role": "student",
    "name": "Test Student",
    "identifier": "test001"
  },
  "token": "eyJ..."
}
```

## 📱 Update Mobile App

After successful deployment:

1. **Copy your Render URL**: `https://your-app-name.onrender.com`
2. **Update mobile app**:
   ```typescript
   // mobile/src/services/api.ts
   const API_URL = 'https://your-app-name.onrender.com';
   ```
3. **Rebuild APK** if needed

## 🔧 Render-Specific Notes

### Free Tier Limitations
- **Sleep after 15 minutes** of inactivity
- **750 hours/month** of runtime
- **Cold starts** may take 10-30 seconds

### Performance Tips
- **Keep-alive requests** to prevent sleeping
- **Upgrade to paid plan** for production use
- **Monitor logs** in Render dashboard

### Automatic Deployments
- **Pushes to main branch** trigger automatic deployments
- **Check deployment logs** if issues occur
- **Rollback available** in Render dashboard

## 🚨 Troubleshooting

### Build Failures
- Check Node.js version in `package.json`
- Verify all dependencies are listed
- Check build logs in Render dashboard

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check Neon database status
- Ensure SSL is enabled

### Runtime Errors
- Check environment variables
- Monitor application logs
- Verify health endpoint responds

## 📊 Monitoring

### Render Dashboard
- **Metrics**: CPU, memory, response times
- **Logs**: Real-time application logs
- **Events**: Deployment history

### Health Monitoring
- **Endpoint**: `/health`
- **Expected**: `{"status":"ok","database":"connected"}`
- **Alerts**: Set up external monitoring if needed

## 🔄 Updates & Maintenance

### Code Updates
```bash
git add .
git commit -m "Update: description"
git push origin main
# Render auto-deploys
```

### Database Migrations
```bash
# If schema changes
npx prisma db push
```

### Environment Variables
- Update via Render dashboard
- Restart service after changes

## ✅ Deployment Checklist

- [ ] Repository connected to Render
- [ ] Build and start commands configured
- [ ] All environment variables added
- [ ] Health check path set to `/health`
- [ ] Service deployed successfully
- [ ] Health endpoint responding
- [ ] Test user registration works
- [ ] Mobile app updated with new URL
- [ ] End-to-end testing completed

## 🎯 Production Ready

Once deployed and tested:
1. **Share API URL** with mobile app team
2. **Update documentation** with production endpoints
3. **Set up monitoring** and alerts
4. **Plan for scaling** if needed
5. **Consider upgrading** to paid plan for production

Your AttendX API will be live at: `https://your-app-name.onrender.com` 🚀
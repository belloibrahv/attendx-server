# Neon Database Setup for AttendX

## Step 1: Create a New Neon Database

1. **Go to Neon Console**: Visit [https://console.neon.tech](https://console.neon.tech)
2. **Sign in/Sign up**: Use your GitHub account or email
3. **Create New Project**: Click "Create Project"
4. **Project Settings**:
   - **Name**: `attendx-production`
   - **Region**: Choose closest to your users (e.g., US East for better performance)
   - **PostgreSQL Version**: Latest (15+)

## Step 2: Get Connection String

1. **Click "Connect"** button on your Project Dashboard
2. **Select**:
   - **Branch**: `main`
   - **Database**: `neondb` (default)
   - **Role**: `neondb_owner` (default)
3. **Copy the connection string** - it should look like:
   ```
   postgresql://neondb_owner:YOUR_PASSWORD@ep-XXXXX-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

## Step 3: Update Environment Variables

Replace the DATABASE_URL in your `.env` file:

```env
DATABASE_URL="postgresql://neondb_owner:YOUR_NEW_PASSWORD@ep-YOUR-ENDPOINT-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
PORT=4000
JWT_SECRET=your_secure_jwt_secret_here
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

## Step 4: Initialize Database

Run these commands to set up the database schema:

```bash
cd server
npm install
npx prisma generate
npx prisma db push
```

## Step 5: Test Connection

```bash
npm run dev
```

Then test the health endpoint:
```bash
curl http://localhost:4000/health
```

Should return:
```json
{
  "status": "ok",
  "time": "2026-03-24T...",
  "database": "connected"
}
```

## Connection String Format

Neon connection strings follow this format:
```
postgresql://[username]:[password]@[host]/[database]?sslmode=require
```

**Important Notes**:
- Always use `sslmode=require` for Neon
- Use the **pooled connection** (ends with `-pooler`) for better performance
- Keep your connection string secure and never commit it to version control

## Troubleshooting

### Connection Timeout
- Check if your IP is whitelisted (Neon allows all IPs by default)
- Verify the connection string is correct
- Try the direct connection string instead of pooled

### Database Not Found
- Ensure the database name matches (usually `neondb`)
- Check if the project is active in Neon console

### Authentication Failed
- Verify username and password in connection string
- Check if the role has proper permissions

## Production Considerations

1. **Environment Variables**: Use environment variables for connection strings
2. **Connection Pooling**: Neon provides built-in pooling with `-pooler` endpoints
3. **SSL**: Always use SSL in production (`sslmode=require`)
4. **Monitoring**: Enable query logging for debugging if needed
5. **Backups**: Neon provides automatic backups, but consider additional backup strategies

## Next Steps

Once the database is connected:
1. Test user registration and login
2. Create a test session
3. Test QR token generation
4. Test attendance check-in flow
5. Deploy to production hosting platform
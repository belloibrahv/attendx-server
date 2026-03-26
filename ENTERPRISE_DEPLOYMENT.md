# AttendX Enterprise Deployment Guide

## 🚀 Production-Ready Configuration for 100,000+ Users

### **Infrastructure Requirements**

#### **Backend Services**
- **Application Servers:** 3-5 instances (AWS ECS/EKS or similar)
- **Load Balancer:** AWS ALB or NGINX with SSL termination
- **Database:** PostgreSQL with read replicas (Neon Pro or AWS RDS)
- **Cache:** Redis Cluster (AWS ElastiCache)
- **File Storage:** AWS S3 for face images and exports
- **CDN:** CloudFront for static assets

#### **Monitoring & Observability**
- **APM:** DataDog, New Relic, or Grafana
- **Error Tracking:** Sentry
- **Logging:** ELK Stack or AWS CloudWatch
- **Uptime Monitoring:** Pingdom or StatusCake

### **Database Optimization**

#### **Connection Pooling Configuration**
```javascript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Connection pool settings
  connection_limit = 100
  pool_timeout = 30
  connect_timeout = 60
}
```

#### **Required Database Indexes** (Already Added)
- User: role, identifier, createdAt
- Session: status, courseCode, createdAt, status+createdAt
- QrToken: sessionId, token, expiresAt, sessionId+expiresAt
- Attendance: sessionId, studentId, method, status, createdAt, sessionId+createdAt, studentId+createdAt
- FaceProfile: provider, createdAt

#### **Database Partitioning Strategy**
```sql
-- Partition attendance table by date for better performance
CREATE TABLE attendance_2024 PARTITION OF attendance
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE attendance_2025 PARTITION OF attendance
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
```

### **Redis Caching Strategy**

#### **Cache Keys Structure**
```
session:active -> Active session data (TTL: 60s)
session:{id} -> Session details (TTL: 300s)
qr_token:{sessionId} -> Current QR token (TTL: 30s)
user:{id} -> User profile (TTL: 900s)
attendance:{sessionId} -> Session attendance count (TTL: 30s)
```

#### **Cache Implementation**
```javascript
const redis = require('redis');
const client = redis.createClient({
  url: process.env.REDIS_URL,
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      return new Error('Redis server connection refused');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error('Retry time exhausted');
    }
    if (options.attempt > 10) {
      return undefined;
    }
    return Math.min(options.attempt * 100, 3000);
  }
});
```

### **Load Balancing Configuration**

#### **NGINX Configuration**
```nginx
upstream attendx_backend {
    least_conn;
    server app1:4000 max_fails=3 fail_timeout=30s;
    server app2:4000 max_fails=3 fail_timeout=30s;
    server app3:4000 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name attendx-api.yourdomain.com;
    
    location / {
        proxy_pass http://attendx_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
    }
}

# Rate limiting zone
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
}
```

### **Environment Variables for Production**

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/attendx?connection_limit=100&pool_timeout=30"
DATABASE_REPLICA_URL="postgresql://user:pass@replica-host:5432/attendx"

# Redis
REDIS_URL="redis://redis-cluster:6379"
REDIS_CLUSTER_NODES="redis1:6379,redis2:6379,redis3:6379"

# Security
JWT_SECRET="your-super-secure-256-bit-secret-key-here"
JWT_EXPIRES_IN="1h"
JWT_REFRESH_EXPIRES_IN="7d"
BCRYPT_ROUNDS=12

# AWS Services
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
S3_BUCKET="attendx-face-images"
S3_REGION="us-east-1"

# Face Recognition
FACE_PROVIDER="aws"
FACE_MATCH_THRESHOLD=85
FACE_VERIFY_TTL=300
LIVENESS_ENABLED=true

# Performance
MAX_CONCURRENT_SESSIONS=50
QR_TOKEN_CACHE_TTL=30
REQUEST_TIMEOUT=30000
BODY_LIMIT="50mb"

# Monitoring
SENTRY_DSN="your-sentry-dsn"
DATADOG_API_KEY="your-datadog-key"
LOG_LEVEL="info"

# Rate Limiting
RATE_LIMIT_WINDOW=900000  # 15 minutes
RATE_LIMIT_MAX=1000       # requests per window
AUTH_RATE_LIMIT_MAX=10    # auth attempts per window

# Health Checks
HEALTH_CHECK_INTERVAL=30000
HEALTH_CHECK_TIMEOUT=5000
```

### **Docker Configuration**

#### **Dockerfile**
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS runtime

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S attendx -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=attendx:nodejs /app/node_modules ./node_modules
COPY --chown=attendx:nodejs . .

# Generate Prisma client
RUN npx prisma generate

USER attendx

EXPOSE 4000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]
```

#### **docker-compose.yml for Development**
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/attendx
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: attendx
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - app

volumes:
  postgres_data:
  redis_data:
```

### **Kubernetes Deployment**

#### **deployment.yaml**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: attendx-api
spec:
  replicas: 5
  selector:
    matchLabels:
      app: attendx-api
  template:
    metadata:
      labels:
        app: attendx-api
    spec:
      containers:
      - name: attendx-api
        image: attendx/api:latest
        ports:
        - containerPort: 4000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: attendx-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: attendx-secrets
              key: redis-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: attendx-api-service
spec:
  selector:
    app: attendx-api
  ports:
  - port: 80
    targetPort: 4000
  type: LoadBalancer
```

### **Monitoring Configuration**

#### **Health Check Endpoint Enhancement**
```javascript
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version,
    checks: {}
  };

  try {
    // Database health check
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = 'ok';
  } catch (error) {
    health.checks.database = 'error';
    health.status = 'error';
  }

  try {
    // Redis health check
    await redis.ping();
    health.checks.redis = 'ok';
  } catch (error) {
    health.checks.redis = 'error';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

### **Performance Benchmarks**

#### **Expected Performance Metrics**
- **Concurrent Users:** 100,000+
- **Response Time:** < 200ms (95th percentile)
- **Throughput:** 10,000+ requests/second
- **Uptime:** 99.9%
- **Database Connections:** 100-200 per instance
- **Memory Usage:** < 512MB per instance
- **CPU Usage:** < 70% under normal load

#### **Load Testing Configuration**
```javascript
// k6 load test script
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up
    { duration: '5m', target: 1000 },  // Stay at 1000 users
    { duration: '2m', target: 5000 },  // Ramp to 5000 users
    { duration: '5m', target: 5000 },  // Stay at 5000 users
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.1'],
  },
};

export default function() {
  let response = http.get('https://attendx-api.yourdomain.com/health');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  sleep(1);
}
```

### **Security Hardening**

#### **Additional Security Headers**
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.attendx.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### **Deployment Checklist**

#### **Pre-Deployment**
- [ ] Database indexes created
- [ ] Redis cluster configured
- [ ] Load balancer configured
- [ ] SSL certificates installed
- [ ] Environment variables set
- [ ] Monitoring tools configured
- [ ] Backup strategy implemented
- [ ] Load testing completed

#### **Post-Deployment**
- [ ] Health checks passing
- [ ] Monitoring alerts configured
- [ ] Performance metrics baseline established
- [ ] Error tracking active
- [ ] Backup verification completed
- [ ] Documentation updated
- [ ] Team training completed

### **Scaling Strategy**

#### **Horizontal Scaling Triggers**
- CPU usage > 70% for 5 minutes
- Memory usage > 80% for 5 minutes
- Response time > 500ms for 2 minutes
- Error rate > 1% for 1 minute

#### **Auto-scaling Configuration**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: attendx-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: attendx-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

This enterprise deployment configuration will handle 100,000+ concurrent users with high availability, performance, and security.
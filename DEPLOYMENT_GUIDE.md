# Smart Attendance System - Deployment Guide

**Version**: 1.0  
**Date**: April 21, 2026  
**Status**: ✅ Ready for Production Deployment

---

## 🚀 Quick Deployment (5 Minutes)

### Step 1: Install Dependencies
```bash
cd server
npm install

cd ../client
npm install
```

### Step 2: Build Frontend
```bash
cd client
npm run build
# Creates optimized dist/ folder
```

### Step 3: Configure Environment
```bash
cd ../server
# Edit .env file with your MongoDB connection
```

### Step 4: Start Server
```bash
npm start
# Server runs on http://localhost:5000
```

### Step 5: Test API
```bash
curl http://localhost:5000/api/health
# Should return: {"status":"ok"}
```

---

## 🗄️ MongoDB Setup (Choose One)

### Option 1: MongoDB Atlas (Cloud) - RECOMMENDED

**Best for**: Production deployments

1. **Create Free Account**
   - Go to https://www.mongodb.com/cloud/atlas
   - Sign up (free tier: 512MB storage)

2. **Create Cluster**
   - Click "Build a Database"
   - Choose Free tier
   - Select region (same as your server)
   - Click "Create"

3. **Get Connection String**
   - Click "Connect" button
   - Choose "Drivers"
   - Copy connection string
   - Replace `<password>` with your password

4. **Update `.env`**
   ```bash
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/attendease?retryWrites=true&w=majority
   ```

5. **Test Connection**
   ```bash
   node test-mongo.js
   # Should show: ✅ MongoDB Atlas Connected Successfully!
   ```

**Pricing**: Free tier (0-2GB data)

---

### Option 2: Local MongoDB

**Best for**: Development and testing

1. **Download MongoDB Community**
   - Windows: https://www.mongodb.com/try/download/community
   - Choose latest version
   - Run installer (requires admin rights)

2. **Start MongoDB Service**
   ```bash
   # Windows (after installation)
   net start MongoDB
   
   # Or run manually:
   mongod
   ```

3. **Update `.env`**
   ```bash
   MONGO_URI=mongodb://localhost:27017/attendease
   ```

4. **Test Connection**
   ```bash
   node test-mongo.js
   # Should show: ✅ MongoDB Connected Successfully!
   ```

**Requirement**: Admin rights to install

---

### Option 3: Docker MongoDB

**Best for**: Containerized deployments

1. **Install Docker Desktop**
   - https://www.docker.com/products/docker-desktop

2. **Start MongoDB Container**
   ```bash
   docker run -d \
     --name attendease-mongo \
     -p 27017:27017 \
     -e MONGO_INITDB_ROOT_USERNAME=admin \
     -e MONGO_INITDB_ROOT_PASSWORD=password \
     mongo:latest
   ```

3. **Update `.env`**
   ```bash
   MONGO_URI=mongodb://admin:password@localhost:27017/attendease?authSource=admin
   ```

4. **Test Connection**
   ```bash
   node test-mongo.js
   ```

**Advantage**: Works on any OS, no installation required

---

## 🔐 Environment Configuration

### Create `.env` file in `server/` folder

```bash
# DATABASE (REQUIRED)
# Choose ONE of the three options above
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/attendease

# AUTHENTICATION
JWT_SECRET=your-super-secret-key-here-min-32-chars
JWT_EXPIRE=7d

# SERVER
PORT=5000
NODE_ENV=production

# EMAIL SERVICE (Optional - for email notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password

# FRONTEND
CLIENT_URL=http://localhost:3000  # or your domain

# SECURITY
GPS_ENFORCE=false  # Set to true for production
GPS_RADIUS_METERS=1000
COLLEGE_DOMAIN=your-domain.com
```

### Getting Gmail App Password
1. Go to https://myaccount.google.com/apppasswords
2. Enable 2-Factor Authentication first
3. Select "Mail" and "Windows Computer"
4. Copy the 16-character password
5. Use in `SMTP_PASS` (NOT your Gmail password)

---

## 📦 Deployment Steps

### Development Mode
```bash
cd server
npm install
npm start
# Server: http://localhost:5000
# Hot reload with nodemon
```

### Production Mode
```bash
# Build frontend
cd client
npm run build

# Start backend
cd ../server
npm install --production
NODE_ENV=production npm start
```

### With PM2 (Recommended for Production)
```bash
npm install -g pm2

# Start
pm2 start server.js --name "attendease-api"
pm2 save

# Monitor
pm2 monit

# Stop
pm2 stop attendease-api
```

### With Docker (Advanced)
```bash
# Build image
docker build -t attendease-api .

# Run container
docker run -d \
  --name attendease \
  -p 5000:5000 \
  --env-file .env \
  attendease-api
```

---

## 🧪 Testing Deployment

### Health Check
```bash
curl http://localhost:5000/api/health
# Should return: {"status":"ok","uptime":...}
```

### API Status
```bash
curl http://localhost:5000/api/status
# Shows database connection status
```

### Smoke Tests
```bash
# 1. Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# 2. Test class list (requires valid token)
curl http://localhost:5000/api/classes \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Test marks (requires valid token)
curl http://localhost:5000/api/marks/class/CLASS_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 Frontend Deployment

### Build Output
```
client/
  dist/
    index.html (main entry point)
    assets/
      *.js (code-split bundles)
      *.css (optimized styles)
```

### Deploy Frontend

#### Option A: Static Hosting (Vercel/Netlify)
```bash
# Build
cd client
npm run build

# Deploy (Vercel)
npm install -g vercel
vercel
```

#### Option B: Serve from Backend
```bash
# Copy dist to server
cp -r client/dist server/public

# In server.js, add:
app.use(express.static('public'));
```

#### Option C: Separate Server (nginx)
```bash
# Build
npm run build

# Copy to nginx
cp -r dist /var/www/attendease/

# Configure nginx.conf
server {
    listen 80;
    root /var/www/attendease;
    
    location /api {
        proxy_pass http://localhost:5000;
    }
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 📈 Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured (.env)
- [ ] MongoDB connection tested (node test-mongo.js)
- [ ] Frontend built successfully (npm run build)
- [ ] Dependencies installed (npm install)
- [ ] No compilation errors (npm start)

### Database
- [ ] MongoDB running or accessible
- [ ] Collections created (auto on first insert)
- [ ] Indexes created (auto on schema definition)
- [ ] Backup strategy planned

### Security
- [ ] JWT_SECRET changed (not default)
- [ ] NODE_ENV set to "production"
- [ ] CORS configured for your domain
- [ ] HTTPS enabled (for production)

### Testing
- [ ] Health check passes (/api/health)
- [ ] API status shows connected (/api/status)
- [ ] Login works with test account
- [ ] Marks can be entered and viewed
- [ ] Email sending works (if configured)

### Monitoring
- [ ] Logs being collected
- [ ] Error monitoring setup (Sentry, etc.)
- [ ] Uptime monitoring active
- [ ] Performance metrics tracked

---

## 🐛 Troubleshooting

### Error: MongoDB Connection Failed
```
Error: querySrv ECONNREFUSED
```
**Solution**:
- Check MongoDB is running
- Verify MONGO_URI in .env
- Test with: `node test-mongo.js`
- Check firewall/network connectivity

### Error: Port 5000 Already in Use
```bash
# Kill process using port 5000
# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac:
lsof -i :5000
kill -9 <PID>
```

### Error: CORS Not Allowing Frontend
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solution**:
- Update CLIENT_URL in .env
- Ensure frontend domain matches
- Check CORS middleware in server.js

### Error: API Not Found (404)
- Check API endpoints are registered
- Verify route files exist
- Check auth middleware

### Error: JWT Token Invalid
- Verify JWT_SECRET matches
- Check token expiry (JWT_EXPIRE)
- Ensure Bearer prefix in Authorization header

---

## 📊 Performance Tips

### Database
- Use indexes for frequently queried fields (done)
- Use aggregation for large datasets (done)
- Implement pagination for lists

### Backend
- Use compression middleware (done)
- Cache frequently accessed data
- Use connection pooling
- Monitor slow queries

### Frontend
- Code splitting (done with lazy loading)
- Image optimization
- CSS/JS minification (done)
- Service workers for offline support

---

## 🔄 Continuous Deployment

### GitHub Actions Example
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: cd server && npm install
      - run: cd ../client && npm install && npm run build
      - run: cd ../server && npm start
```

---

## 📞 Support

### Logs Location
```bash
# Server logs
tail -f server.log

# MongoDB logs
# Windows: C:\Program Files\MongoDB\Server\4.4\log\
# Linux: /var/log/mongodb/
```

### Common Commands
```bash
# Test database
node test-mongo.js

# Check database contents
mongosh
use attendease
db.collections()

# Reset database
node reset.js

# Seed test data
node seed.js
```

---

## ✅ Deployment Checklist

```
Frontend:
✅ Built to dist/
✅ Assets optimized
✅ No errors

Backend:
✅ Dependencies installed
✅ Routes registered
✅ Middleware configured
✅ Error handling in place

Database:
⏳ MongoDB configured
⏳ Connection tested
⏳ Collections ready

Ready to Deploy: [ ]
```

---

## 🎯 Next Steps

1. **Configure MongoDB** (choose option above)
2. **Test Connection** (`node test-mongo.js`)
3. **Start Server** (`npm start`)
4. **Test API** (`curl http://localhost:5000/api/health`)
5. **Deploy Frontend** (to Vercel, Netlify, or nginx)
6. **Monitor Logs** (watch for errors)
7. **Enable HTTPS** (for production)

---

**Status**: ✅ **READY FOR DEPLOYMENT**

**Questions?** See README.md or QUICK_REFERENCE.md

---

*Last Updated: April 21, 2026*
*Smart Attendance System v1.0*

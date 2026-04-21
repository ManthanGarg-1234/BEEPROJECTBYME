# Smart Attendance System - Quick Reference Guide

**Last Updated**: April 21, 2026  
**System Status**: ✅ Production Ready

---

## 🚀 Quick Start

### Backend Setup
```bash
cd server
npm install
# Set environment variables (see .env section)
npm start
# Verify: curl http://localhost:5000/api/health
```

### Frontend Setup
```bash
cd client
npm install
npm run dev  # Development
npm run build  # Production build
```

---

## 📋 Core Features

### 1. Authentication
**Login Page**: `/login`
- Student account OR Teacher account
- JWT token-based authentication
- Passwords hashed with bcrypt

**User Roles**:
- 👨‍🎓 **Student**: View attendance, marks, reports
- 👨‍🏫 **Teacher**: Manage classes, attendance, marks, email, reports

---

### 2. Attendance Management

#### For Teachers
**Live Attendance**: `/teacher/attendance`
- Generate QR code for session
- Real-time student marking
- View attendance in progress
- Session management

**Manual Attendance**: `/teacher/manual-attendance`
- Manually mark attendance
- Bulk edit before saving
- Previous session history

#### For Students
**QR Scanner**: `/student/scan-qr`
- Scan teacher's QR code
- Auto-mark attendance
- Confirmation message

**Attendance Report**: `/student/attendance-report`
- View personal attendance
- Percentage calculation
- Monthly breakdown

---

### 3. Marks Management

#### For Teachers
**Marks Entry**: `/teacher/marks`
1. Select class
2. Enter marks for students:
   - Quiz, Midterm, Assignment, Practical, Project
3. System auto-calculates:
   - Total (sum of all components)
   - Percentage (total/max * 100)
   - Grade (A/B/C/D/F based on thresholds)
4. Save per student

**Thresholds**:
- A: 90%+
- B: 80-89%
- C: 70-79%
- D: 60-69%
- F: <60%

#### For Students
**StudentDashboard**: `/student/dashboard`
- View all enrolled classes
- See marks for each class:
  - Components breakdown
  - Total percentage
  - Grade with color coding
- Updates real-time when teacher enters marks

---

### 4. Email Notifications 🆕

#### For Teachers
**Email Notifications**: `/teacher/email`

**Step 1: Select Class**
- Choose class from dropdown
- System fetches students with <75% attendance

**Step 2: Review Students**
- List shows name, roll number, attendance %
- Select recipients individually or "Select All"

**Step 3: Compose Email**
- Edit subject line
- Edit message body
- Use placeholders:
  - `{studentName}` - Auto-filled per student
  - `{className}` - Class name
  - `{classId}` - Class ID

**Example Email**:
```
Subject: Attendance Warning - {className}

Dear {studentName},

Your attendance in {className} ({classId}) is currently 68%.
Please improve your attendance to meet the minimum 75% requirement.

Best regards,
Academic Team
```

**Step 4: Preview**
- Click "Preview Email"
- Shows personalized sample for first student
- Confirms number of recipients
- Back to edit if needed

**Step 5: Send**
- Click "Send to All"
- Confirmation popup
- System sends emails via SMTP
- Shows success/failure count

**Step 6: History**
- View all previous sends
- See date, recipient count, success/failure
- Check batch details

**Features**:
- ✅ Prevents duplicate emails (24h per student per class)
- ✅ Personalization for each recipient
- ✅ Batch tracking with unique ID
- ✅ Success/failure logging

---

### 5. Analytics & Reports

#### For Teachers
**Teacher Dashboard**: `/teacher/dashboard`
- Daily attendance trends (graph)
- Group-wise statistics
- Subject-wise breakdown
- Session history
- Low attendance alerts

**Reports**: `/teacher/reports`
- Class-wise reports
- Student-wise reports
- Attendance trends
- Marks distribution

#### For Students
**Student Dashboard**: `/student/dashboard`
- Enrolled classes
- Attendance percentage per class
- Marks overview
- Personal statistics

---

## 🔐 Security & Authorization

### URL Protection
- ✅ `/student/*` - Only students can access
- ✅ `/teacher/*` - Only teachers can access
- ✅ Public pages: `/login`, `/register`, `/change-password`

### Data Protection
- ✅ Teachers see only their classes' data
- ✅ Students see only their own data
- ✅ Passwords never transmitted in plain text
- ✅ JWT tokens expire after set period

---

## 📊 Database Collections

### Users
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  rollNumber: String,
  phoneNumber: String,
  role: 'student' | 'teacher',
  profilePicture: String,
  createdAt: Date
}
```

### Classes
```javascript
{
  classId: String (unique),
  subject: String,
  teacher: ObjectId (ref: User),
  enrolledStudents: [ObjectId],
  semester: Number,
  credits: Number
}
```

### Attendance
```javascript
{
  student: ObjectId (ref: User),
  class: ObjectId (ref: Class),
  session: ObjectId (ref: Session),
  status: 'present' | 'absent' | 'late',
  timestamp: Date
}
```

### Marks
```javascript
{
  student: ObjectId (ref: User),
  class: ObjectId (ref: Class),
  quiz: { obtained: Number, max: Number },
  midterm: { obtained: Number, max: Number },
  assignment: { obtained: Number, max: Number },
  practical: { obtained: Number, max: Number },
  project: { obtained: Number, max: Number },
  // Auto-calculated:
  total: Number,
  percentage: Number,
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
}
```

### Sessions
```javascript
{
  class: ObjectId (ref: Class),
  date: Date,
  startTime: Date,
  endTime: Date,
  qrCode: String,
  createdBy: ObjectId (ref: User)
}
```

### EmailLog
```javascript
{
  teacher: ObjectId (ref: User),
  class: ObjectId (ref: Class),
  subject: String,
  body: String,
  batchId: String (unique),
  recipients: [
    {
      student: ObjectId,
      email: String,
      status: 'sent' | 'failed',
      failureReason: String
    }
  ],
  totalRecipients: Number,
  successCount: Number,
  failureCount: Number,
  sentAt: Date
}
```

---

## 🔌 API Endpoints

### Authentication
```
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/change-password
```

### Classes
```
GET    /api/classes                    # Get all classes
POST   /api/classes                    # Create class (teacher)
GET    /api/classes/:id                # Get class details
PUT    /api/classes/:id                # Update class (teacher)
DELETE /api/classes/:id                # Delete class (teacher)
POST   /api/classes/:id/enroll         # Enroll student
```

### Attendance
```
POST   /api/attendance/start-session   # Start attendance session
POST   /api/attendance                 # Mark attendance
GET    /api/attendance/:classId        # Get attendance (teacher)
GET    /api/attendance/student/:classId # Get student attendance
```

### Marks
```
POST   /api/marks                      # Create/update marks
GET    /api/marks/class/:classId       # Get class marks (teacher)
PUT    /api/marks/:id                  # Update marks (teacher)
DELETE /api/marks/:id                  # Delete marks (teacher)
GET    /api/marks/student/:classId     # Get student marks
GET    /api/marks/stats/:classId       # Get class statistics
```

### Email
```
GET    /api/email/low-attendance/:classId    # Get low attendance students
POST   /api/email/preview                    # Preview email
POST   /api/email/send                       # Send emails
GET    /api/email/history                    # Get send history
GET    /api/email/log/:batchId               # Get batch details
GET    /api/email/check-duplicate/:classId/:studentId
```

### Analytics
```
GET    /api/analytics/dashboard/:classId     # Dashboard data
GET    /api/analytics/daily-trends/:classId  # Daily trends
GET    /api/analytics/group-stats            # Group statistics
GET    /api/analytics/subject-breakdown      # Subject breakdown
GET    /api/analytics/session-history        # Session history
```

---

## 🛠️ Common Tasks

### Task 1: Add New Class
1. Teacher goes to `/teacher/classes`
2. Click "Add New Class"
3. Enter: Class ID, Subject Name, Semester
4. Click Save
5. Class appears in list

### Task 2: Mark Attendance
1. Teacher goes to `/teacher/attendance`
2. Click "Start New Session"
3. Generate QR code
4. Students scan QR from `/student/scan-qr`
5. Live updates on teacher screen
6. End session when done

### Task 3: Enter Marks
1. Teacher goes to `/teacher/marks`
2. Select class
3. For each student, enter:
   - Quiz marks
   - Midterm marks
   - Assignment marks
   - Practical marks
   - Project marks
4. Click "Save" for each student
5. Grade auto-calculates

### Task 4: Send Email to Low Attendance
1. Teacher goes to `/teacher/email`
2. Select class
3. Review students with <75% attendance
4. Select recipients
5. Compose email
6. Click "Preview"
7. Click "Send to All"
8. Confirm
9. View results

### Task 5: Check Attendance Status
1. Student goes to `/student/attendance-report`
2. Sees percentage per class
3. Sees total classes attended vs total classes
4. Color coding shows status

### Task 6: View Marks
1. Student goes to `/student/dashboard`
2. Selects class
3. Sees:
   - All marks components
   - Total
   - Percentage
   - Grade
   - Grade color (A=green, F=red, etc.)

---

## 📱 Mobile Support

✅ All pages responsive:
- Mobile menu navigation
- Touch-friendly buttons
- Responsive tables
- Mobile-optimized forms
- QR code scanning works on mobile

---

## ⚙️ Environment Variables

### Required .env file
```
# Database
MONGO_URI=mongodb://localhost:27017/attendance-system

# Authentication
JWT_SECRET=your-super-secret-key-here
JWT_EXPIRE=7d

# Server
PORT=5000
NODE_ENV=production

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password-here

# Frontend
VITE_API_URL=http://localhost:5000
```

### Gmail App Password (NOT regular password)
1. Go to Google Account settings
2. Enable 2-Factor Authentication
3. Go to App Passwords
4. Select "Mail" and "Windows Computer"
5. Copy the generated password
6. Use in SMTP_PASSWORD

---

## 🐛 Troubleshooting

### Issue: Can't login
- ✅ Check email is correct
- ✅ Check password
- ✅ Verify account exists
- ✅ Check backend is running

### Issue: Marks not showing
- ✅ Verify teacher entered marks
- ✅ Verify student is enrolled
- ✅ Refresh page
- ✅ Check console for errors

### Issue: Emails not sending
- ✅ Check SMTP credentials in .env
- ✅ Verify Gmail app password (not regular password)
- ✅ Check teacher email address exists
- ✅ Check student email addresses are valid

### Issue: Attendance not marking
- ✅ Verify QR code is valid
- ✅ Check student is enrolled in class
- ✅ Verify session is active
- ✅ Try refreshing page

### Issue: API not responding
- ✅ Check backend is running (`npm start`)
- ✅ Check port 5000 is available
- ✅ Check MongoDB connection
- ✅ Check firewall settings

---

## 📞 Support Contacts

**Technical Issues**: Check error logs
```bash
# Backend logs
tail -f logs/error.log

# Browser console
F12 → Console tab
```

**Database Issues**: MongoDB admin
```bash
mongosh
use attendance-system
db.collections()
```

---

## ✅ Checklist Before Going Live

- [ ] Environment variables set
- [ ] MongoDB connection verified
- [ ] All users created (test accounts)
- [ ] Classes created and students enrolled
- [ ] Email SMTP configured
- [ ] Backend server running
- [ ] Frontend built and serving
- [ ] Tested login/logout
- [ ] Tested attendance marking
- [ ] Tested marks entry
- [ ] Tested email sending
- [ ] Tested student viewing marks
- [ ] Backups configured

---

## 📈 Performance Tips

1. **Database**: Create indexes on frequently queried fields
2. **Frontend**: Use lazy loading (already implemented)
3. **Backend**: Use aggregation pipelines (already done)
4. **Caching**: Consider Redis for frequently accessed data
5. **Pagination**: Limit returned records

---

## 🔄 Regular Maintenance

### Daily
- Monitor logs
- Check system availability
- Verify database size

### Weekly
- Database backup verification
- Performance metrics review
- Error log analysis

### Monthly
- Database optimization
- Security updates
- Code updates
- Dependency updates

---

## 📚 Full Documentation

For detailed documentation, see:
- `README.md` - Project overview
- `PHASE_4_COMPLETION_REPORT.md` - Email system details
- `PHASE_5_COMPLETION_REPORT.md` - Testing & deployment
- `PROJECT_COMPLETION_REPORT.md` - Full project summary
- API documentation in code comments

---

**Last Updated**: April 21, 2026  
**Status**: ✅ Production Ready  
**Version**: 1.0

# Proxy Attendance Detection & Notification System

## 🎯 Overview

Your system now has a **comprehensive, multi-layer notification system** that alerts teachers immediately when proxy attendance is detected. This ensures real-time awareness of suspicious activities.

## 📋 What Gets Notified?

When a student tries to mark attendance for another student from the same device in the same session:

### 1. **🎵 Audio Alert**
- Generates a beeping sound (800Hz then 1000Hz)
- Plays immediately when proxy is detected
- Uses Web Audio API for cross-browser compatibility

### 2. **📢 Toast Notification (Browser Popup)**
- Visual notification that slides in from the top-right
- Shows: Proxy Student Name → Victim Student Name
- Auto-dismisses after 8 seconds
- Can be manually dismissed

### 3. **🔔 Browser Desktop Notification**
- Native OS notification (if user gave permission)
- Shows on taskbar/notification center
- Requires user interaction to view details
- Persists until dismissed

### 4. **📍 Page Title Badge**
- Updates browser tab title with alert count
- Example: `(3) 🚨 Attendance System`
- Helps teacher notice alerts even when window is minimized

### 5. **⚠️ Real-time Alert Panel**
- Displays on LiveAttendance page
- Shows **proxy marker details** (who's marking)
- Shows **victim details** (whose attendance is faked)
- Shows device ID and timestamp
- Has pulsing animation to draw attention

## 🔄 Flow Diagram

```
Student A marks own attendance
            ↓
Attendance recorded ✓
            ↓
Student A tries to mark Student B's attendance
            ↓
PROXY DETECTED via Device Check
            ↓
┌─────────────────────────────────────┐
│   MULTI-LAYER NOTIFICATION SENT     │
├─────────────────────────────────────┤
│ 1. Audio beep plays               │
│ 2. Toast popup appears             │
│ 3. Desktop notification (if allowed)│
│ 4. Page title badge updated        │
│ 5. Alert panel shows details       │
│ 6. SuspiciousLog created           │
│ 7. Real-time Socket sent to teacher│
└─────────────────────────────────────┘
            ↓
Teacher sees IMMEDIATE alert
```

## 📁 Implementation Details

### New Files Created:

1. **`client/src/utils/notificationManager.js`**
   - Core notification functions
   - Audio generation
   - Browser notification API handling
   - Page title badge management

2. **`client/src/components/ToastContainer.jsx`**
   - Reusable toast notification component
   - Listens for `show-toast` events
   - Auto-dismiss timer
   - Smooth animations

### Files Modified:

1. **`client/src/App.jsx`**
   - Added ToastContainer globally
   - Ensures notifications work on all pages

2. **`client/src/pages/teacher/LiveAttendance.jsx`**
   - Integrated notification manager
   - Triggers notifications on proxy alert
   - Updates page title badge
   - Requests browser notification permission

## 🚀 How Teachers Use It

### Step 1: Permission Prompt
When teacher opens LiveAttendance page:
- Browser asks: "Allow notifications from this site?"
- Click "Allow" to enable desktop notifications

### Step 2: Live Monitoring
- Teacher monitors attendance in real-time
- All alert types trigger automatically
- Visual + audio feedback ensures awareness

### Step 3: Alert Panel Actions
- Review proxy details
- View device ID involved
- See timestamp of incident
- Dismiss individual alerts (badge updates)

## 🎨 UI Components

### Toast Notification Styles:
```
┌─────────────────────────────────═
│ 🚨 PROXY DETECTED: Student A    │
│ marking Student B's attendance   │  ← Error (Red)
│              [×]                 │
└─────────────────────────────────┘
```

### Alert Panel Card:
```
┌──── PROXY ATTEMPT ALERTS (1) 🔴 ────┐
│ 🚨 Proxy Attendance Detected!         │
│                                       │
│ 🕵️ Student A (Roll: 18) → 👤 Student B │
│ (Roll: 45)                           │
│                                       │
│ 📱 Device: ABC123XYZ  🕐 10:30:45    │
│              × [Dismiss]              │
└────────────────────────────────────────┘
```

## 🔧 Configuration

### Audio Alert Settings (in notificationManager.js):
```javascript
oscillator.frequency.value = 800;  // First beep frequency
// Then switches to 1000Hz after 100ms
gainNode.gain.setValueAtTime(0.3, audioContext.currentTime); // Volume: 30%
```

### Toast Duration:
- Default: 5000ms (5 seconds)
- Proxy alerts: 8000ms (8 seconds - longer for critical alerts)

### Page Title Update:
- Counter shown in format: `(count) 🚨 Attendance System`
- Resets when teacher navigates away

## ✅ Security Benefits

1. **Immediate Detection** - No delay in alerting
2. **Multi-Channel** - Multiple notification types ensure awareness
3. **Real-time Tracking** - Live socket updates
4. **Audit Trail** - All incidents logged in SuspiciousLog
5. **Device Tracking** - Device ID recorded for investigation

## 🎯 Testing

To test the proxy detection system:

1. **Create a test session** with multiple students
2. **Have Student A** scan QR and mark attendance ✓
3. **Same device used by Student A** to mark Student B's attendance
4. **Observe:**
   - Audio alert plays ✓
   - Toast notification appears ✓
   - Desktop notification (if enabled) ✓
   - Page title shows badge: `(1) 🚨 Attendance System` ✓
   - Alert panel displays with details ✓

## 🔮 Future Enhancements

Potential additions:
- Email notifications to teacher
- Telegram/SMS alerts for critical incidents
- Proxy pattern analysis (repeat offenders)
- Automatic action triggers (block device, reject attendance)
- Admin dashboard for all proxy incidents
- Attendance correction interface for teachers

## 📝 Notes

- Notifications persist until teacher dismisses them
- Proxy alerts don't block the student from marking attendance initially
- Teacher can manually reject the proxy attendance via teacher interface
- All proxy attempts are logged regardless of notification delivery
- Audio mutes if browser has audio disabled or in silent mode

---

**Last Updated:** March 28, 2026
**System Status:** ✅ Fully Functional

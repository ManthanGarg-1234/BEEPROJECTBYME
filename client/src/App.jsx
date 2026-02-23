import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';
import Login from './pages/Login';
import Register from './pages/Register';
import ChangePassword from './pages/ChangePassword';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import ClassManagement from './pages/teacher/ClassManagement';
import BulkEnroll from './pages/teacher/BulkEnroll';
import SessionManager from './pages/teacher/SessionManager';
import LiveAttendance from './pages/teacher/LiveAttendance';
import AttendanceReport from './pages/teacher/AttendanceReport';
import EvaluationPanel from './pages/teacher/EvaluationPanel';
import ManualAttendance from './pages/teacher/ManualAttendance';
import StudentDashboard from './pages/student/StudentDashboard';
import ScanQR from './pages/student/ScanQR';

function App() {
    const { loading, isAuthenticated, user } = useAuth();

    if (loading) return <LoadingSpinner />;

    const getDefaultRedirect = () => {
        if (!isAuthenticated) return '/login';
        if (user?.firstLogin) return '/change-password';
        return user?.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard';
    };

    return (
        <div className="app-shell">
            <div className="app-bg" aria-hidden="true">
                <video
                    className="app-bg-video"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="metadata"
                    poster="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80"
                >
                    <source src="https://storage.coverr.co/videos/coverr-working-on-a-laptop-8530/1080p.mp4" type="video/mp4" />
                </video>
                <div className="app-bg-grid"></div>
                <div className="app-bg-orb app-bg-orb--one"></div>
                <div className="app-bg-orb app-bg-orb--two"></div>
                <div className="app-bg-orb app-bg-orb--three"></div>
            </div>
            <div className="app-content">
                {isAuthenticated && <Navbar />}
                <Routes>
                {/* Public Routes */}
                <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to={getDefaultRedirect()} />} />
                <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to={getDefaultRedirect()} />} />

                {/* Change Password (first login) */}
                <Route path="/change-password" element={
                    <ProtectedRoute><ChangePassword /></ProtectedRoute>
                } />

                {/* Teacher Routes */}
                <Route path="/teacher/dashboard" element={
                    <ProtectedRoute role="teacher"><TeacherDashboard /></ProtectedRoute>
                } />
                <Route path="/teacher/classes" element={
                    <ProtectedRoute role="teacher"><ClassManagement /></ProtectedRoute>
                } />
                <Route path="/teacher/classes/:classId/enroll" element={
                    <ProtectedRoute role="teacher"><BulkEnroll /></ProtectedRoute>
                } />
                <Route path="/teacher/session" element={
                    <ProtectedRoute role="teacher"><SessionManager /></ProtectedRoute>
                } />
                <Route path="/teacher/session/:sessionId/live" element={
                    <ProtectedRoute role="teacher"><LiveAttendance /></ProtectedRoute>
                } />
                <Route path="/teacher/reports" element={
                    <ProtectedRoute role="teacher"><AttendanceReport /></ProtectedRoute>
                } />
                <Route path="/teacher/evaluation" element={
                    <ProtectedRoute role="teacher"><EvaluationPanel /></ProtectedRoute>
                } />
                <Route path="/teacher/manual-attendance" element={
                    <ProtectedRoute role="teacher"><ManualAttendance /></ProtectedRoute>
                } />

                {/* Student Routes */}
                <Route path="/student/dashboard" element={
                    <ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>
                } />
                <Route path="/student/scan" element={
                    <ProtectedRoute role="student"><ScanQR /></ProtectedRoute>
                } />

                {/* Default redirect */}
                <Route path="*" element={<Navigate to={getDefaultRedirect()} />} />
                </Routes>
            </div>
        </div>
    );
}

export default App;

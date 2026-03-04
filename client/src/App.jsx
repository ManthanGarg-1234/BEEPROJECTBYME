import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState, Suspense, lazy } from 'react';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy-loaded pages — Vite will split these into separate chunks
// so first-visit only downloads the code for the current page
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'));
const ClassManagement = lazy(() => import('./pages/teacher/ClassManagement'));
const BulkEnroll = lazy(() => import('./pages/teacher/BulkEnroll'));
const SessionManager = lazy(() => import('./pages/teacher/SessionManager'));
const LiveAttendance = lazy(() => import('./pages/teacher/LiveAttendance'));
const AttendanceReport = lazy(() => import('./pages/teacher/AttendanceReport'));
const EvaluationPanel = lazy(() => import('./pages/teacher/EvaluationPanel'));
const ManualAttendance = lazy(() => import('./pages/teacher/ManualAttendance'));
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const StudentAttendanceReport = lazy(() => import('./pages/student/AttendanceReport'));
const Subjects = lazy(() => import('./pages/student/Subjects'));
const ScanQR = lazy(() => import('./pages/student/ScanQR'));

function App() {
    const { loading, isAuthenticated, user } = useAuth();
    const [reducedMotion, setReducedMotion] = useState(false);
    const [showVideo, setShowVideo] = useState(true);

    useEffect(() => {
        // Always use reduced motion to prevent UI lag
        setReducedMotion(true);
        setShowVideo(false);
    }, []);

    if (loading) return <LoadingSpinner />;

    const getDefaultRedirect = () => {
        if (!isAuthenticated) return '/login';
        if (user?.firstLogin) return '/change-password';
        return user?.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard';
    };

    return (
        <div className={`app-shell${reducedMotion ? ' app-shell--reduced' : ''}`}>
            <div className="app-bg" aria-hidden="true">
                {showVideo && (
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
                )}
                <div className="app-bg-grid"></div>
                <div className="app-bg-orb app-bg-orb--one"></div>
                <div className="app-bg-orb app-bg-orb--two"></div>
                <div className="app-bg-orb app-bg-orb--three"></div>
            </div>
            <div className="app-content">
                {isAuthenticated && <Navbar />}
                <Suspense fallback={<LoadingSpinner />}>
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
                        <Route path="/student/subjects" element={
                            <ProtectedRoute role="student"><Subjects /></ProtectedRoute>
                        } />
                        <Route path="/student/scan" element={
                            <ProtectedRoute role="student"><ScanQR /></ProtectedRoute>
                        } />
                        <Route path="/student/reports" element={
                            <ProtectedRoute role="student"><StudentAttendanceReport /></ProtectedRoute>
                        } />

                        {/* Teacher URL aliases — short/alternate paths redirect to canonical routes */}
                        <Route path="/teacher/home" element={<Navigate to="/teacher/dashboard" replace />} />
                        <Route path="/teacher/manual" element={<Navigate to="/teacher/manual-attendance" replace />} />
                        <Route path="/teacher/manual-attendence" element={<Navigate to="/teacher/manual-attendance" replace />} />
                        <Route path="/teacher/class" element={<Navigate to="/teacher/classes" replace />} />
                        <Route path="/teacher/sessions" element={<Navigate to="/teacher/session" replace />} />
                        <Route path="/teacher/report" element={<Navigate to="/teacher/reports" replace />} />
                        <Route path="/teacher/live" element={<Navigate to="/teacher/session" replace />} />

                        {/* Student URL aliases — short/alternate paths redirect to canonical routes */}
                        <Route path="/student/home" element={<Navigate to="/student/dashboard" replace />} />
                        <Route path="/student/report" element={<Navigate to="/student/reports" replace />} />
                        <Route path="/student/scan-qr" element={<Navigate to="/student/scan" replace />} />
                        <Route path="/student/mark" element={<Navigate to="/student/scan" replace />} />
                        <Route path="/student/subject" element={<Navigate to="/student/subjects" replace />} />

                        {/* Default redirect */}
                        <Route path="*" element={<Navigate to={getDefaultRedirect()} />} />
                    </Routes>
                </Suspense>
            </div>
        </div>
    );
}

export default App;

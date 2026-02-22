import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../api';

const SessionManager = () => {
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [attendanceWindow, setAttendanceWindow] = useState(10);
    const [activeSession, setActiveSession] = useState(null);
    const [qrData, setQrData] = useState('');
    const [location, setLocation] = useState(null);
    const [locationError, setLocationError] = useState('');
    const [loading, setLoading] = useState(false);
    const [windowTimer, setWindowTimer] = useState('');
    const [windowClosed, setWindowClosed] = useState(false);
    const socket = useSocket();
    const navigate = useNavigate();

    useEffect(() => {
        fetchClasses();
        getLocation();
    }, []);

    // Attendance window countdown
    useEffect(() => {
        if (!activeSession) return;
        const interval = setInterval(() => {
            const remaining = new Date(activeSession.attendanceWindowEnd) - new Date();
            if (remaining <= 0) {
                setWindowTimer('Window Closed');
                setWindowClosed(true);
                clearInterval(interval);
                return;
            }
            const mins = Math.floor(remaining / 60000);
            const secs = Math.floor((remaining % 60000) / 1000);
            setWindowTimer(`${mins}:${secs.toString().padStart(2, '0')}`);
        }, 1000);
        return () => clearInterval(interval);
    }, [activeSession]);

    // Socket: QR refresh & window events
    useEffect(() => {
        if (!socket || !activeSession) return;
        socket.emit('join-session', activeSession._id);

        socket.on('qr-refresh', (data) => {
            setQrData(data.qrToken);
        });

        socket.on('session-update', (data) => {
            if (data.type === 'SESSION_ENDED') {
                setActiveSession(null);
                setWindowClosed(false);
            }
            if (data.type === 'ATTENDANCE_WINDOW_CLOSED') {
                setWindowClosed(true);
                setWindowTimer('Window Closed');
            }
        });

        return () => {
            socket.emit('leave-session', activeSession._id);
            socket.off('qr-refresh');
            socket.off('session-update');
        };
    }, [socket, activeSession]);

    const fetchClasses = async () => {
        try {
            const res = await api.get('/classes');
            setClasses(res.data);
            if (res.data.length > 0) setSelectedClass(res.data[0].classId);

            // Check for any active session across all classes
            for (const cls of res.data) {
                try {
                    const sessionRes = await api.get(`/sessions/active/${cls.classId}`);
                    if (sessionRes.data && sessionRes.data.isActive) {
                        const s = sessionRes.data;
                        setActiveSession({
                            _id: s._id,
                            classId: cls.classId,
                            subject: cls.subject,
                            qrToken: s.qrToken,
                            attendanceWindowEnd: s.attendanceWindowEnd,
                            startTime: s.startTime,
                            isActive: true
                        });
                        setQrData(s.qrToken);
                        // Check if attendance window already closed
                        if (new Date() >= new Date(s.attendanceWindowEnd)) {
                            setWindowClosed(true);
                            setWindowTimer('Window Closed');
                        }
                        break;
                    }
                } catch (e) {
                    // No active session for this class, continue
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const getLocation = () => {
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            (err) => setLocationError('Location access denied. Please enable GPS.'),
            { enableHighAccuracy: true }
        );
    };

    const startSession = async () => {
        if (!location) {
            alert('Location is required. Please enable GPS.');
            getLocation();
            return;
        }
        setLoading(true);
        try {
            const res = await api.post('/sessions/start', {
                classId: selectedClass,
                attendanceWindow,
                latitude: location.latitude,
                longitude: location.longitude
            });
            setActiveSession(res.data.session);
            setQrData(res.data.session.qrToken);
            setWindowClosed(false);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to start session');
        } finally {
            setLoading(false);
        }
    };

    const endSession = async () => {
        if (!confirm('End this session?')) return;
        try {
            await api.post(`/sessions/${activeSession._id}/end`);
            setActiveSession(null);
            setQrData('');
            setWindowClosed(false);
        } catch (err) {
            alert('Failed to end session');
        }
    };

    return (
        <div className="page-container animate-fade-in">
            <h1 className="section-title text-3xl mb-2">Session Manager</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">Start and manage attendance sessions</p>

            {!activeSession ? (
                /* Start Session Form */
                <div className="max-w-lg mx-auto">
                    <div className="glass-card-solid p-8">
                        <div className="text-center mb-6">
                            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-r from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/30 mb-4">
                                <span className="text-4xl">📡</span>
                            </div>
                            <h2 className="text-xl font-bold dark:text-white">Start New Session</h2>
                        </div>

                        {/* Location Status */}
                        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${location ? 'bg-green-500/10 border border-green-500/20' : 'bg-yellow-500/10 border border-yellow-500/20'
                            }`}>
                            <span className="text-xl">{location ? '📍' : '⏳'}</span>
                            <div>
                                <p className={`text-sm font-medium ${location ? 'text-green-500' : 'text-yellow-500'}`}>
                                    {location ? 'Location Acquired' : locationError || 'Getting location...'}
                                </p>
                                {location && (
                                    <p className="text-xs text-gray-500">
                                        {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                                    </p>
                                )}
                            </div>
                            {!location && (
                                <button onClick={getLocation} className="ml-auto text-primary-500 text-sm font-medium hover:text-primary-400">
                                    Retry
                                </button>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Class</label>
                                <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="input-field">
                                    {classes.map(c => (
                                        <option key={c._id} value={c.classId}>{c.classId} - {c.subject}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">
                                    Attendance Window (minutes)
                                </label>
                                <p className="text-xs text-gray-400 mb-1">
                                    QR will be active for this many minutes. Students must scan within this window.
                                </p>
                                <input type="number" value={attendanceWindow} onChange={(e) => setAttendanceWindow(parseInt(e.target.value) || 10)}
                                    min="1" max="30" className="input-field" />
                            </div>

                            <button onClick={startSession} disabled={loading || !location} className="w-full btn-primary py-4 text-lg">
                                {loading ? 'Starting...' : '🚀 Start Session'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                /* Active Session */
                <div className="max-w-2xl mx-auto">
                    <div className="glass-card-solid p-8 text-center">
                        {/* Status Badge */}
                        <div className="mb-6">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-green-500 font-medium text-sm">Session Active</span>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 mt-2">{activeSession.classId} - {activeSession.subject}</p>
                        </div>

                        {/* Attendance Window Timer */}
                        <div className={`mb-6 p-6 rounded-2xl ${windowClosed
                            ? 'bg-red-500/10 border border-red-500/20'
                            : 'bg-green-500/5 border border-green-500/20'
                            }`}>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
                                {windowClosed ? 'Attendance Window' : 'QR Active — Time Remaining'}
                            </p>
                            <p className={`text-5xl font-bold font-mono ${windowClosed
                                ? 'text-red-400'
                                : 'text-green-500'
                                }`}>
                                {windowTimer}
                            </p>
                            {windowClosed && (
                                <p className="text-sm text-red-400 mt-2">
                                    Students can no longer scan. You can still end the session or use manual attendance.
                                </p>
                            )}
                        </div>

                        {/* QR Code + Token Display — only show while window is open */}
                        {!windowClosed && (
                            <div className="bg-gray-50 dark:bg-dark-700 rounded-2xl p-8 mb-6">
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Scan this QR Code</p>
                                <div className="bg-white rounded-2xl p-6 inline-block shadow-lg mx-auto">
                                    <QRCodeSVG
                                        value={qrData}
                                        size={250}
                                        level="H"
                                        includeMargin={true}
                                        bgColor="#ffffff"
                                        fgColor="#1e293b"
                                    />
                                </div>
                                <div className="mt-4">
                                    <p className="text-xs text-gray-400 mb-1">Token</p>
                                    <p className="font-mono text-[10px] break-all text-gray-500 dark:text-gray-400 max-w-md mx-auto">{qrData}</p>
                                </div>
                                <p className="text-xs text-gray-400 mt-3">
                                    🔄 Auto-refreshes every 30 seconds
                                </p>
                            </div>
                        )}

                        <div className="flex gap-4">
                            <button onClick={() => navigate(`/teacher/session/${activeSession._id}/live`)}
                                className="flex-1 btn-secondary py-3">
                                📊 Live Attendance
                            </button>
                            <button onClick={() => navigate('/teacher/manual-attendance')}
                                className="flex-1 btn-secondary py-3">
                                ✏️ Manual
                            </button>
                            <button onClick={endSession} className="flex-1 btn-danger py-3">
                                ⏹ End Session
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SessionManager;

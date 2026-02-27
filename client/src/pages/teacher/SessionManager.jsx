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

    useEffect(() => { fetchClasses(); getLocation(); }, []);

    useEffect(() => {
        if (!activeSession) return;
        const interval = setInterval(() => {
            const remaining = new Date(activeSession.attendanceWindowEnd) - new Date();
            if (remaining <= 0) { setWindowTimer('Window Closed'); setWindowClosed(true); clearInterval(interval); return; }
            const mins = Math.floor(remaining / 60000);
            const secs = Math.floor((remaining % 60000) / 1000);
            setWindowTimer(`${mins}:${secs.toString().padStart(2, '0')}`);
        }, 1000);
        return () => clearInterval(interval);
    }, [activeSession]);

    useEffect(() => {
        if (!socket || !activeSession) return;
        socket.emit('join-session', activeSession._id);
        socket.on('qr-refresh', (data) => setQrData(data.qrToken));
        socket.on('session-update', (data) => {
            if (data.type === 'SESSION_ENDED') { setActiveSession(null); setWindowClosed(false); }
            if (data.type === 'ATTENDANCE_WINDOW_CLOSED') { setWindowClosed(true); setWindowTimer('Window Closed'); }
        });
        return () => { socket.emit('leave-session', activeSession._id); socket.off('qr-refresh'); socket.off('session-update'); };
    }, [socket, activeSession]);

    const fetchClasses = async () => {
        try {
            const res = await api.get('/classes');
            setClasses(res.data);
            if (res.data.length > 0) setSelectedClass(res.data[0].classId);
            for (const cls of res.data) {
                try {
                    const sessionRes = await api.get(`/sessions/active/${cls.classId}`);
                    if (sessionRes.data && sessionRes.data.isActive) {
                        const s = sessionRes.data;
                        setActiveSession({ _id: s._id, classId: cls.classId, subject: cls.subject, qrToken: s.qrToken, attendanceWindowEnd: s.attendanceWindowEnd, startTime: s.startTime, isActive: true });
                        setQrData(s.qrToken);
                        if (new Date() >= new Date(s.attendanceWindowEnd)) { setWindowClosed(true); setWindowTimer('Window Closed'); }
                        break;
                    }
                } catch (e) { }
            }
        } catch (err) { console.error(err); }
    };

    const getLocation = () => {
        if (!navigator.geolocation) { setLocationError('Geolocation is not supported'); return; }
        navigator.geolocation.getCurrentPosition(
            (pos) => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
            () => setLocationError('Location access denied. Please enable GPS.'),
            { enableHighAccuracy: true }
        );
    };

    const startSession = async () => {
        if (!location) { alert('Location is required. Please enable GPS.'); getLocation(); return; }
        setLoading(true);
        try {
            const res = await api.post('/sessions/start', {
                classId: selectedClass,
                attendanceWindow,
                latitude: location.latitude,
                longitude: location.longitude,
                accuracy: location.accuracy
            });
            setActiveSession(res.data.session);
            setQrData(res.data.session.qrToken);
            setWindowClosed(false);
        } catch (err) { alert(err.response?.data?.message || 'Failed to start session'); }
        finally { setLoading(false); }
    };

    const endSession = async () => {
        if (!confirm('End this session?')) return;
        try { await api.post(`/sessions/${activeSession._id}/end`); setActiveSession(null); setQrData(''); setWindowClosed(false); }
        catch (err) { alert('Failed to end session'); }
    };

    return (
        <div className="page-container">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <span className="text-white text-lg">🎯</span>
                </div>
                <h1 className="text-3xl font-extrabold bg-gradient-to-r from-amber-600 via-orange-500 to-rose-500 bg-clip-text text-transparent">
                    Session Manager
                </h1>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-8 ml-[52px]">Start and manage attendance sessions</p>

            {!activeSession ? (
                <div className="max-w-lg mx-auto">
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 to-orange-400 p-[1px] shadow-lg shadow-amber-500/15">
                        <div className="bg-white dark:bg-dark-800 rounded-[15px] p-6 sm:p-8 relative overflow-hidden">

                            <div className="text-center mb-6 relative">
                                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-xl shadow-amber-500/25 mb-4">
                                    <span className="text-4xl">📡</span>
                                </div>
                                <h2 className="text-xl font-bold dark:text-white">Start New Session</h2>
                            </div>

                            {/* Location */}
                            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${location
                                ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800/30'
                                : 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800/30'
                                }`}>
                                <span className="text-xl">{location ? '📍' : '⏳'}</span>
                                <div>
                                    <p className={`text-sm font-semibold ${location ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                        {location ? 'Location Acquired' : locationError || 'Getting location...'}
                                    </p>
                                    {location && <p className="text-xs text-gray-500">{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</p>}
                                </div>
                                {!location && (
                                    <button onClick={getLocation} className="ml-auto text-amber-600 dark:text-amber-400 text-sm font-bold hover:text-amber-700 transition-colors">Retry</button>
                                )}
                            </div>

                            <div className="space-y-4 relative">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Class</label>
                                    <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-dark-700 border-2 border-gray-200 dark:border-dark-600 text-gray-800 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all">
                                        {classes.map(c => <option key={c._id} value={c.classId}>{c.classId} — {c.subject}</option>)}
                                    </select>
                                    {selectedClass && (
                                        <div className="mt-2 flex items-center gap-2">
                                            <span className="text-xs text-gray-400">Selected Class ID:</span>
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-semibold">
                                                🆔 {selectedClass}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                                        Attendance Window (minutes)
                                    </label>
                                    <p className="text-xs text-gray-400 mb-1">QR will be active for this many minutes.</p>
                                    <input type="number" value={attendanceWindow} onChange={(e) => setAttendanceWindow(parseInt(e.target.value) || 10)}
                                        min="1" max="30" className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-dark-700 border-2 border-gray-200 dark:border-dark-600 text-gray-800 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" />
                                </div>
                                <button onClick={startSession} disabled={loading || !location}
                                    className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-lg font-bold rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50">
                                    {loading ? 'Starting...' : '🚀 Start Session'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="max-w-2xl mx-auto">
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 p-[1px] shadow-lg shadow-emerald-500/15">
                        <div className="bg-white dark:bg-dark-800 rounded-[15px] p-8 text-center relative overflow-hidden">

                            {/* Status Badge */}
                            <div className="mb-6 relative">
                                <div className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border border-emerald-200 dark:border-emerald-700/40">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">Session Active</span>
                                </div>
                                <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-sm font-mono font-bold">
                                        🆔 {activeSession.classId}
                                    </span>
                                    <span className="text-gray-400 dark:text-gray-400 text-sm font-medium">{activeSession.subject}</span>
                                </div>
                            {/* Timer */}
                            <div className={`mb-6 p-6 rounded-2xl relative ${windowClosed
                                ? 'bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-900/20 dark:to-red-900/20 border border-rose-200 dark:border-rose-800/30'
                                : 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 border border-emerald-200 dark:border-emerald-800/20'
                                }`}>
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-widest">
                                    {windowClosed ? '⏱ Attendance Window' : '⚡ QR Active — Time Remaining'}
                                </p>
                                <p className={`text-5xl font-extrabold font-mono ${windowClosed ? 'text-rose-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent'}`}>
                                    {windowTimer}
                                </p>
                                {windowClosed && <p className="text-sm text-rose-400 mt-2">Students can no longer scan. Use manual attendance or end the session.</p>}
                            </div>

                            {/* QR */}
                            {!windowClosed && (
                                <div className="relative bg-gradient-to-br from-gray-50 to-indigo-50/30 dark:from-dark-700 dark:to-dark-700 rounded-2xl p-8 mb-6">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-medium">Ask students to scan this QR Code</p>
                                    <div className="bg-white rounded-2xl p-6 inline-block shadow-xl shadow-indigo-500/10 border-2 border-indigo-100 dark:border-indigo-900/30 mx-auto">
                                        <QRCodeSVG value={qrData} size={250} level="H" includeMargin={true} bgColor="#ffffff" fgColor="#1e293b" />
                                    </div>
                                    <div className="mt-4">
                                        <p className="text-xs text-gray-400 mb-1">Token</p>
                                        <p className="font-mono text-[10px] break-all text-gray-400 max-w-md mx-auto">{qrData}</p>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-3 font-medium">🔄 Auto-refreshes every 1 minute</p>
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-3 relative">
                                <button onClick={() => navigate(`/teacher/session/${activeSession._id}/live`)}
                                    className="flex-1 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-500 to-cyan-400 text-white shadow-md shadow-blue-500/15">
                                    📊 Live Attendance
                                </button>
                                <button onClick={() => navigate('/teacher/manual-attendance')}
                                    className="flex-1 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-violet-500 to-purple-400 text-white shadow-md shadow-violet-500/15">
                                    ✏️ Manual
                                </button>
                                <button onClick={endSession}
                                    className="flex-1 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-rose-500 to-red-400 text-white shadow-md shadow-rose-500/15">
                                    ⏹ End Session
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SessionManager;

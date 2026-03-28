import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import api from '../../api';

const LiveAttendance = () => {
    const { sessionId } = useParams();
    const [session, setSession] = useState(null);
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [proxyAlerts, setProxyAlerts] = useState([]);
    const socket = useSocket();
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, [sessionId]);

    useEffect(() => {
        if (!socket || !sessionId) return;
        socket.emit('join-session', sessionId);

        socket.on('attendance-update', (data) => {
            setAttendance(prev => {
                const exists = prev.find(a => a.student?._id === data.student?._id);
                if (exists) return prev;
                return [...prev, data];
            });
        });

        socket.on('session-update', (data) => {
            if (data.type === 'SESSION_ENDED') {
                setSession(prev => prev ? { ...prev, isActive: false } : null);
            }
        });

        socket.on('proxy-alert', (data) => {
            setProxyAlerts(prev => [
                { ...data, id: `${Date.now()}-${Math.random()}` },
                ...prev
            ]);
        });

        return () => {
            socket.emit('leave-session', sessionId);
            socket.off('attendance-update');
            socket.off('session-update');
            socket.off('proxy-alert');
        };
    }, [socket, sessionId]);

    const dismissAlert = (id) => {
        setProxyAlerts(prev => prev.filter(a => a.id !== id));
    };

    const fetchData = async () => {
        try {
            const [sessRes, attRes] = await Promise.all([
                api.get(`/sessions/${sessionId}`),
                api.get(`/attendance/session/${sessionId}`)
            ]);
            setSession(sessRes.data);
            setAttendance(attRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="page-container">
            <div className="animate-pulse space-y-4">
                <div className="h-8 skeleton rounded w-1/3"></div>
                <div className="h-64 skeleton rounded"></div>
            </div>
        </div>
    );

    return (
        <div className="page-container">
            <button onClick={() => navigate('/teacher/session')}
                className="flex items-center text-gray-500 dark:text-gray-400 hover:text-primary-500 mb-6 transition-colors">
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Session
            </button>

            {/* CSS keyframes for proxy alert pulse */}
            <style>{`
                @keyframes proxyPulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
                    50% { box-shadow: 0 0 0 10px rgba(239,68,68,0.22); }
                }
                .proxy-alert-card {
                    animation: proxyPulse 1.3s ease-in-out 3;
                }
            `}</style>

            {/* ── Proxy Alert Panel ─────────────────────────────────────────── */}
            {proxyAlerts.length > 0 && (
                <div className="mb-6 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            🚨 Proxy Attempt Alerts ({proxyAlerts.length})
                        </span>
                    </div>
                    {proxyAlerts.map(alert => (
                        <div
                            key={alert.id}
                            className="proxy-alert-card"
                            style={{
                                background: 'linear-gradient(135deg, rgba(239,68,68,0.13), rgba(234,88,12,0.10))',
                                border: '1.5px solid rgba(239,68,68,0.5)',
                                borderRadius: '14px',
                                padding: '16px 20px',
                            }}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 min-w-0">
                                    <div style={{
                                        minWidth: 42, height: 42,
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #ef4444, #f97316)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 20, flexShrink: 0,
                                        boxShadow: '0 0 18px rgba(239,68,68,0.45)'
                                    }}>🚨</div>
                                    <div className="min-w-0">
                                        <p style={{ fontWeight: 800, fontSize: 15, color: '#fca5a5', marginBottom: 8 }}>
                                            Proxy Attendance Detected!
                                        </p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                                            {/* Attacker card */}
                                            <div style={{
                                                background: 'rgba(239,68,68,0.15)',
                                                border: '1px solid rgba(239,68,68,0.35)',
                                                borderRadius: 10, padding: '8px 14px'
                                            }}>
                                                <p style={{ fontSize: 10, color: '#f87171', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
                                                    🕵️ Proxy Marker (Is Marking)
                                                </p>
                                                <p style={{ fontWeight: 700, color: '#fef2f2', fontSize: 14 }}>
                                                    {alert.proxyStudent?.name || 'Unknown'}
                                                </p>
                                                <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#fca5a5', marginTop: 2 }}>
                                                    Roll: {alert.proxyStudent?.rollNumber || '—'}
                                                </p>
                                            </div>
                                            {/* arrow */}
                                            <span style={{ color: '#fb923c', fontWeight: 700, fontSize: 20 }}>→</span>
                                            {/* Victim card */}
                                            <div style={{
                                                background: 'rgba(234,88,12,0.15)',
                                                border: '1px solid rgba(234,88,12,0.35)',
                                                borderRadius: 10, padding: '8px 14px'
                                            }}>
                                                <p style={{ fontSize: 10, color: '#fb923c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
                                                    👤 Proxy For (Victim's Attendance)
                                                </p>
                                                <p style={{ fontWeight: 700, color: '#fff7ed', fontSize: 14 }}>
                                                    {alert.victimStudent?.name || 'Unknown'}
                                                </p>
                                                <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#fdba74', marginTop: 2 }}>
                                                    Roll: {alert.victimStudent?.rollNumber || '—'}
                                                </p>
                                            </div>
                                        </div>
                                        <p style={{ marginTop: 10, fontSize: 12, color: '#9ca3af' }}>
                                            📱 Device ID:&nbsp;
                                            <span style={{ fontFamily: 'monospace', color: '#d1d5db' }}>{alert.deviceId || '—'}</span>
                                            &nbsp;&nbsp;🕐 {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : ''}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => dismissAlert(alert.id)}
                                    title="Dismiss"
                                    style={{
                                        background: 'rgba(239,68,68,0.18)',
                                        border: '1px solid rgba(239,68,68,0.4)',
                                        borderRadius: '50%', width: 30, height: 30,
                                        cursor: 'pointer', color: '#fca5a5',
                                        fontWeight: 700, fontSize: 16, flexShrink: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        lineHeight: 1
                                    }}
                                >×</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="section-title text-2xl sm:text-3xl">Live Attendance</h1>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-gray-500 dark:text-gray-400 text-sm">{session?.class?.subject}</span>
                        {session?.class?.classId && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono font-semibold">
                                🆔 {session.class.classId}
                            </span>
                        )}
                    </div>
                </div>

                <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${session?.isActive
                        ? 'bg-green-500/10 border border-green-500/30'
                        : 'bg-gray-500/10 border border-gray-500/30'
                    }`}>
                    <div className={`w-2 h-2 rounded-full ${session?.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                    <span className={`text-sm font-medium ${session?.isActive ? 'text-green-500' : 'text-gray-500'}`}>
                        {session?.isActive ? 'Live' : 'Ended'}
                    </span>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="stat-card text-center">
                    <p className="text-3xl font-bold text-green-500">{attendance.filter(a => a.status === 'Present').length}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Present</p>
                </div>
                <div className="stat-card text-center">
                    <p className="text-3xl font-bold text-yellow-500">{attendance.filter(a => a.status === 'Late').length}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Late</p>
                </div>
                <div className="stat-card text-center">
                    <p className="text-3xl font-bold text-primary-500">{attendance.length}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Marked</p>
                </div>
                <div className="stat-card text-center" style={{ position: 'relative' }}>
                    <p className="text-3xl font-bold text-red-500">{attendance.filter(a => a.suspiciousFlag).length}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Suspicious</p>
                    {proxyAlerts.length > 0 && (
                        <span style={{
                            position: 'absolute', top: 8, right: 8,
                            background: '#ef4444', color: '#fff',
                            borderRadius: '50%', width: 20, height: 20,
                            fontSize: 11, fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>{proxyAlerts.length}</span>
                    )}
                </div>
            </div>

            {/* Attendance List */}
            <div className="glass-card-solid p-6">
                <h3 className="font-semibold dark:text-white mb-4">Attendance Records</h3>
                {attendance.length === 0 ? (
                    <div className="text-center py-12">
                        <span className="text-4xl block mb-3">⏳</span>
                        <p className="text-gray-500 dark:text-gray-400">Waiting for students to mark attendance...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto -mx-1">
                        <table className="w-full text-sm min-w-[520px]">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-dark-600">
                                    <th className="text-left py-3 px-3 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">#</th>
                                    <th className="text-left py-3 px-3 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Roll No</th>
                                    <th className="text-left py-3 px-3 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Name</th>
                                    <th className="text-center py-3 px-3 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Status</th>
                                    <th className="text-center py-3 px-3 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Distance</th>
                                    <th className="text-center py-3 px-3 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Time</th>
                                    <th className="text-center py-3 px-3 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Flag</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attendance.map((a, idx) => (
                                    <tr key={a._id || idx} className="border-b border-gray-100 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors">
                                        <td className="py-3 px-3 dark:text-gray-300">{idx + 1}</td>
                                        <td className="py-3 px-3 font-mono text-xs dark:text-gray-300 whitespace-nowrap">{a.student?.rollNumber}</td>
                                        <td className="py-3 px-3 dark:text-white font-medium whitespace-nowrap">{a.student?.name}</td>
                                        <td className="py-3 px-3 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${a.status === 'Present' ? 'bg-green-500/10 text-green-500' :
                                                    a.status === 'Late' ? 'bg-yellow-500/10 text-yellow-500' :
                                                        'bg-red-500/10 text-red-500'
                                                }`}>{a.status}</span>
                                        </td>
                                        <td className="py-3 px-3 text-center text-xs dark:text-gray-300 whitespace-nowrap">
                                            {typeof a.distance === 'number' ? `${a.distance.toFixed(1)}m` : '-'}
                                        </td>
                                        <td className="py-3 px-3 text-center text-xs dark:text-gray-300 whitespace-nowrap">
                                            {a.markedAt ? new Date(a.markedAt).toLocaleTimeString() : '-'}
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            {a.suspiciousFlag && <span className="text-red-500 text-lg" title="Suspicious">⚠️</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LiveAttendance;

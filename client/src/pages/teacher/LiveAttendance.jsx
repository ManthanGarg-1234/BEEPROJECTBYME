import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import api from '../../api';

const LiveAttendance = () => {
    const { sessionId } = useParams();
    const [session, setSession] = useState(null);
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
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

        return () => {
            socket.emit('leave-session', sessionId);
            socket.off('attendance-update');
            socket.off('session-update');
        };
    }, [socket, sessionId]);

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

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="section-title text-3xl">Live Attendance</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {session?.class?.classId} - {session?.class?.subject}
                    </p>
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
                <div className="stat-card text-center">
                    <p className="text-3xl font-bold text-red-500">{attendance.filter(a => a.suspiciousFlag).length}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Suspicious</p>
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
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-dark-600">
                                    <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">#</th>
                                    <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Roll No</th>
                                    <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Name</th>
                                    <th className="text-center py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Status</th>
                                    <th className="text-center py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Distance</th>
                                    <th className="text-center py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Time</th>
                                    <th className="text-center py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Flag</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attendance.map((a, idx) => (
                                    <tr key={a._id || idx} className="border-b border-gray-100 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors">
                                        <td className="py-3 px-4 dark:text-gray-300">{idx + 1}</td>
                                        <td className="py-3 px-4 font-mono text-xs dark:text-gray-300">{a.student?.rollNumber}</td>
                                        <td className="py-3 px-4 dark:text-white font-medium">{a.student?.name}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${a.status === 'Present' ? 'bg-green-500/10 text-green-500' :
                                                    a.status === 'Late' ? 'bg-yellow-500/10 text-yellow-500' :
                                                        'bg-red-500/10 text-red-500'
                                                }`}>{a.status}</span>
                                        </td>
                                        <td className="py-3 px-4 text-center text-xs dark:text-gray-300">
                                            {typeof a.distance === 'number' ? `${a.distance.toFixed(1)}m` : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-center text-xs dark:text-gray-300">
                                            {a.markedAt ? new Date(a.markedAt).toLocaleTimeString() : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-center">
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

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../api';

const StudentDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await api.get('/analytics/student-dashboard');
                setData(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    if (loading) return (
        <div className="page-container">
            <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-32 skeleton rounded-2xl"></div>)}
            </div>
        </div>
    );

    if (!data || data.classes.length === 0) {
        return (
            <div className="page-container">
                <div className="glass-card-solid p-12 text-center">
                    <span className="text-6xl block mb-4">📚</span>
                    <h2 className="text-2xl font-bold dark:text-white mb-2">No Classes</h2>
                    <p className="text-gray-500 dark:text-gray-400">You are not enrolled in any class yet.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container animate-fade-in">
            <div className="mb-8">
                <h1 className="section-title text-3xl">My Attendance</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Welcome, {data.student.name}</p>
            </div>

            <div className="space-y-8">
                {data.classes.map((cls) => (
                    <div key={cls.classId} className="glass-card-solid p-6 animate-slide-up">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 flex items-center justify-center text-white text-lg font-bold shadow-lg">
                                    {cls.classId.substring(0, 3)}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold dark:text-white">{cls.subject}</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{cls.classId} • {cls.teacher}</p>
                                </div>
                            </div>

                            {/* Attendance Percentage Circle */}
                            <div className="relative w-20 h-20">
                                <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                                    <path d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831"
                                        fill="none" stroke="#e5e7eb" strokeWidth="3" className="dark:stroke-dark-600" />
                                    <path d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831"
                                        fill="none" strokeWidth="3" strokeDasharray={`${cls.percentage}, 100`}
                                        stroke={cls.percentage >= 75 ? '#10b981' : cls.percentage >= 65 ? '#f59e0b' : '#ef4444'}
                                        strokeLinecap="round" />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className={`text-sm font-bold ${cls.percentage >= 75 ? 'text-green-500' : cls.percentage >= 65 ? 'text-yellow-500' : 'text-red-500'
                                        }`}>{cls.percentage}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="bg-green-500/10 rounded-xl p-3 text-center">
                                <p className="text-xl font-bold text-green-500">{cls.presentCount}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Present</p>
                            </div>
                            <div className="bg-primary-500/10 rounded-xl p-3 text-center">
                                <p className="text-xl font-bold text-primary-500">{cls.totalSessions}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                            </div>
                            <div className="bg-gray-500/10 rounded-xl p-3 text-center">
                                <p className="text-xl font-bold dark:text-white">{cls.semesterProgress}%</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Semester</p>
                            </div>
                        </div>

                        {/* Warning badge */}
                        {cls.warningLevel && (
                            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${cls.warningLevel === 'Critical'
                                    ? 'bg-red-500/10 border border-red-500/30'
                                    : 'bg-yellow-500/10 border border-yellow-500/30'
                                }`}>
                                <span className="text-2xl">{cls.warningLevel === 'Critical' ? '🚨' : '⚠️'}</span>
                                <div>
                                    <p className={`font-semibold ${cls.warningLevel === 'Critical' ? 'text-red-500' : 'text-yellow-500'}`}>
                                        {cls.warningLevel} Warning
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Your attendance is below the required 75% threshold.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Timeline Chart */}
                        {cls.attendanceTimeline.length > 0 && (
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Attendance Timeline</h3>
                                <div className="flex gap-1.5 flex-wrap">
                                    {cls.attendanceTimeline.map((t, i) => (
                                        <div key={i} title={`${t.date}: ${t.status}`}
                                            className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-medium cursor-default transition-transform hover:scale-125 ${t.status === 'Present' ? 'bg-green-500 text-white' :
                                                    t.status === 'Late' ? 'bg-yellow-500 text-white' :
                                                        'bg-red-500/20 text-red-400'
                                                }`}>
                                            {t.status === 'Present' ? '✓' : t.status === 'Late' ? 'L' : '✕'}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StudentDashboard;

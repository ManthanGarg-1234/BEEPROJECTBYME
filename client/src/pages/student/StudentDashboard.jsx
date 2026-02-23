import { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../api';

const useAnimatedCounter = (end, duration = 1000) => {
    const [count, setCount] = useState(0);
    const prevEnd = useRef(0);
    useEffect(() => {
        if (end === undefined || end === null) return;
        const startVal = prevEnd.current;
        prevEnd.current = end;
        const startTime = Date.now();
        const step = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(startVal + (end - startVal) * eased));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [end, duration]);
    return count;
};

const StudentDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await api.get('/analytics/student-dashboard');
                setData(res.data);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetchDashboard();
    }, []);

    if (loading) return (
        <div className="page-container">
            <div className="space-y-6">
                <div className="h-12 w-64 skeleton rounded-xl"></div>
                {[1, 2].map(i => <div key={i} className="h-56 skeleton rounded-2xl"></div>)}
            </div>
        </div>
    );

    if (!data || data.classes.length === 0) {
        return (
            <div className="page-container">
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 p-[1px]">
                    <div className="bg-white dark:bg-dark-800 rounded-[22px] p-12 text-center relative overflow-hidden">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-cyan-200 to-blue-200 dark:from-cyan-900/30 dark:to-blue-900/30 rounded-full blur-2xl"></div>
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-br from-indigo-200 to-purple-200 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-full blur-2xl"></div>

                        <div className="relative mx-auto w-40 h-40 mb-6">
                            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-float">
                                <circle cx="100" cy="100" r="80" fill="url(#stuGrad)" opacity="0.08" />
                                <rect x="55" y="60" width="90" height="80" rx="12" fill="url(#stuGrad)" opacity="0.15" />
                                <circle cx="100" cy="85" r="15" fill="#60a5fa" opacity="0.4" />
                                <path d="M80 115c0-11 9-20 20-20s20 9 20 20" stroke="#3b82f6" strokeWidth="3" fill="none" strokeLinecap="round" />
                                <circle cx="150" cy="55" r="12" fill="#fbbf24" opacity="0.8" />
                                <path d="M146 55l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                <defs>
                                    <linearGradient id="stuGrad" x1="0" y1="0" x2="200" y2="200">
                                        <stop stopColor="#06b6d4" />
                                        <stop offset="1" stopColor="#6366f1" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold dark:text-white mb-2 relative">No Classes Yet</h2>
                        <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto relative">
                            You are not enrolled in any class yet. Ask your teacher to add you!
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Color palette for class cards
    const cardColors = [
        { gradient: 'from-blue-500 to-cyan-400', light: 'from-blue-50 to-cyan-50', text: 'text-blue-600', shadow: 'shadow-blue-500/20' },
        { gradient: 'from-violet-500 to-purple-400', light: 'from-violet-50 to-purple-50', text: 'text-violet-600', shadow: 'shadow-violet-500/20' },
        { gradient: 'from-emerald-500 to-teal-400', light: 'from-emerald-50 to-teal-50', text: 'text-emerald-600', shadow: 'shadow-emerald-500/20' },
        { gradient: 'from-rose-500 to-pink-400', light: 'from-rose-50 to-pink-50', text: 'text-rose-600', shadow: 'shadow-rose-500/20' },
        { gradient: 'from-amber-500 to-orange-400', light: 'from-amber-50 to-orange-50', text: 'text-amber-600', shadow: 'shadow-amber-500/20' },
    ];

    return (
        <div className="page-container">
            <div className="mb-8 animate-fade-in">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <span className="text-white text-lg">🎓</span>
                    </div>
                    <h1 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        My Attendance
                    </h1>
                </div>
                <p className="text-gray-500 dark:text-gray-400 ml-[52px]">
                    Welcome back, <span className="font-semibold text-gray-700 dark:text-gray-200">{data.student.name}</span> 👋
                </p>
            </div>

            <div className="space-y-6 stagger-children">
                {data.classes.map((cls, index) => (
                    <ClassCard key={cls.classId} cls={cls} colors={cardColors[index % cardColors.length]} />
                ))}
            </div>
        </div>
    );
};

const ClassCard = ({ cls, colors }) => {
    const animPercent = useAnimatedCounter(cls.percentage);
    const animPresent = useAnimatedCounter(cls.presentCount);
    const animTotal = useAnimatedCounter(cls.totalSessions);

    const ringColor = cls.percentage >= 75 ? '#10b981' : cls.percentage >= 65 ? '#f59e0b' : '#ef4444';

    return (
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${colors.gradient} p-[1px] ${colors.shadow} shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01]`}>
            <div className="bg-white dark:bg-dark-800 rounded-[15px] relative overflow-hidden">
                {/* Colorful Header Bar */}
                <div className={`bg-gradient-to-r ${colors.gradient} px-6 py-4`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-lg font-bold">
                                {cls.classId.substring(0, 3)}
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">{cls.subject}</h2>
                                <p className="text-white/70 text-sm">{cls.classId} • {cls.teacher}</p>
                            </div>
                        </div>
                        {/* Percentage Ring */}
                        <div className="relative w-16 h-16">
                            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                                <path d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831"
                                    fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                                <path d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831"
                                    fill="none" strokeWidth="3"
                                    strokeDasharray={`${animPercent}, 100`}
                                    stroke="white"
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-sm font-extrabold text-white">{animPercent}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="p-6">
                    <div className="grid grid-cols-3 gap-3 mb-5">
                        <div className={`bg-gradient-to-br ${colors.light} dark:bg-emerald-900/10 rounded-xl p-4 text-center transition-transform duration-300 hover:scale-105`}>
                            <p className="text-2xl font-extrabold text-emerald-500">{animPresent}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">Present</p>
                        </div>
                        <div className={`bg-gradient-to-br ${colors.light} dark:bg-blue-900/10 rounded-xl p-4 text-center transition-transform duration-300 hover:scale-105`}>
                            <p className={`text-2xl font-extrabold ${colors.text} dark:text-blue-400`}>{animTotal}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">Total</p>
                        </div>
                        <div className={`bg-gradient-to-br ${colors.light} dark:bg-purple-900/10 rounded-xl p-4 text-center transition-transform duration-300 hover:scale-105`}>
                            <p className="text-2xl font-extrabold text-purple-500">{cls.semesterProgress}%</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">Semester</p>
                        </div>
                    </div>

                    {/* Warning */}
                    {cls.warningLevel && (
                        <div className={`mb-5 p-4 rounded-xl flex items-center gap-3 ${cls.warningLevel === 'Critical'
                            ? 'bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-900/20 dark:to-red-900/20 border border-rose-200 dark:border-rose-800/30'
                            : 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800/30'
                            }`}>
                            <span className="text-2xl">{cls.warningLevel === 'Critical' ? '🚨' : '⚠️'}</span>
                            <div>
                                <p className={`font-bold ${cls.warningLevel === 'Critical' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                    {cls.warningLevel} Warning
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Attendance below 75% threshold
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Timeline */}
                    {cls.attendanceTimeline.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                                📋 Attendance Timeline
                            </h3>
                            <div className="flex gap-1.5 flex-wrap">
                                {cls.attendanceTimeline.map((t, i) => (
                                    <div key={i} title={`${t.date}: ${t.status}`}
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold cursor-default transition-all duration-200 hover:scale-125 ${t.status === 'Present'
                                            ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-sm shadow-emerald-500/30'
                                            : t.status === 'Late'
                                                ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm shadow-amber-500/30'
                                                : 'bg-gradient-to-br from-rose-100 to-red-100 dark:from-rose-900/30 dark:to-red-900/30 text-rose-500'
                                            }`}>
                                        {t.status === 'Present' ? '✓' : t.status === 'Late' ? 'L' : '✕'}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;

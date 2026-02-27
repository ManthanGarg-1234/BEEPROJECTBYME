import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';

const Subjects = () => {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    const photoUrl = user?.profilePhoto
        ? `${import.meta.env.VITE_API_URL || ''}/uploads/profiles/${user.profilePhoto}`
        : '';

    const quickNav = [
        { label: 'Dashboard', path: '/student/dashboard', icon: '📊' },
        { label: 'Subjects', path: '/student/subjects', icon: '📚' },
        { label: 'Scan QR', path: '/student/scan', icon: '📷' },
        { label: 'Reports', path: '/student/reports', icon: '📈' },
    ];

    // Color palette for subject cards
    const cardColors = [
        { gradient: 'from-blue-500 to-cyan-400', shadow: 'shadow-blue-500/20', iconBg: 'bg-blue-400/20', badge: 'bg-blue-500/10 text-blue-200' },
        { gradient: 'from-violet-500 to-purple-400', shadow: 'shadow-violet-500/20', iconBg: 'bg-violet-400/20', badge: 'bg-violet-500/10 text-violet-200' },
        { gradient: 'from-emerald-500 to-teal-400', shadow: 'shadow-emerald-500/20', iconBg: 'bg-emerald-400/20', badge: 'bg-emerald-500/10 text-emerald-200' },
        { gradient: 'from-rose-500 to-pink-400', shadow: 'shadow-rose-500/20', iconBg: 'bg-rose-400/20', badge: 'bg-rose-500/10 text-rose-200' },
        { gradient: 'from-amber-500 to-orange-400', shadow: 'shadow-amber-500/20', iconBg: 'bg-amber-400/20', badge: 'bg-amber-500/10 text-amber-200' },
        { gradient: 'from-indigo-500 to-blue-400', shadow: 'shadow-indigo-500/20', iconBg: 'bg-indigo-400/20', badge: 'bg-indigo-500/10 text-indigo-200' },
    ];

    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const res = await api.get('/analytics/student-dashboard');
                setClasses(res.data?.classes || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchSubjects();
    }, []);

    if (loading) {
        return (
            <div className="page-container">
                <div className="space-y-6">
                    <div className="h-12 w-64 skeleton rounded-xl"></div>
                    {[1, 2, 3].map(i => <div key={i} className="h-40 skeleton rounded-2xl"></div>)}
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
                {/* Sidebar */}
                <aside className="glass-card-solid p-5 h-fit lg:sticky lg:top-24">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center text-white text-lg shadow-lg shadow-cyan-500/30">
                            🎓
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/80">Student Hub</p>
                            <h2 className="text-lg font-bold text-white">My Dashboard</h2>
                        </div>
                    </div>

                    <div className="space-y-3 mb-6">
                        {quickNav.map((item) => (
                            <button
                                key={item.path}
                                type="button"
                                onClick={() => navigate(item.path)}
                                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border text-slate-200 transition-all duration-300 ${location.pathname === item.path
                                    ? 'border-cyan-300/70 bg-cyan-500/10 text-white'
                                    : 'border-slate-700/50 bg-slate-900/60 hover:border-cyan-300/60 hover:text-white'
                                    }`}
                            >
                                <span className="flex items-center gap-2 text-sm font-medium">
                                    <span className="text-lg">{item.icon}</span>
                                    {item.label}
                                </span>
                                <span className="text-xs text-slate-400">→</span>
                            </button>
                        ))}
                    </div>

                    {classes.length > 0 && (
                        <>
                            <h3 className="text-sm font-semibold text-slate-200 mb-3">My Subjects</h3>
                            <div className="space-y-2">
                                {classes.map((cls) => (
                                    <button
                                        key={cls.classId}
                                        type="button"
                                        onClick={() => navigate(`/student/reports?classId=${cls.classId}`)}
                                        className="w-full text-left rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2.5 text-slate-200 hover:border-cyan-300/60 hover:text-white transition-all duration-300"
                                    >
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-semibold">{cls.subject}</p>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700/60">
                                                {cls.classId}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">{cls.teacher}</p>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </aside>

                {/* Main Content */}
                <div>
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between gap-4 mb-1">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                    <span className="text-white text-lg">📚</span>
                                </div>
                                <h1 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                    My Subjects
                                </h1>
                            </div>

                            {/* Student photo in top-right */}
                            <div className="flex items-center gap-3 rounded-2xl border border-slate-200/20 bg-white/70 dark:bg-dark-800/70 px-3 py-2 shadow-lg shadow-blue-500/5">
                                <div className="w-11 h-11 rounded-xl overflow-hidden border border-cyan-200/60 bg-slate-900/40">
                                    {photoUrl ? (
                                        <img src={photoUrl} alt={user?.name || 'Student'} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-500 text-white text-sm font-bold">
                                            {user?.name?.charAt(0)?.toUpperCase() || 'S'}
                                        </div>
                                    )}
                                </div>
                                <div className="hidden sm:block">
                                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-500/80">Student</p>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{user?.name || 'Student'}</p>
                                </div>
                            </div>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 ml-[52px]">
                            Click on any subject to view your attendance report
                        </p>
                    </div>

                    {classes.length === 0 ? (
                        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 p-[1px]">
                            <div className="bg-white dark:bg-dark-800 rounded-[22px] p-12 text-center relative overflow-hidden">
                                <div className="relative mx-auto w-20 h-20 mb-6 bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30 rounded-2xl flex items-center justify-center">
                                    <span className="text-4xl">📚</span>
                                </div>
                                <h2 className="text-2xl font-bold dark:text-white mb-2 relative">No Subjects Yet</h2>
                                <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto relative">
                                    You are not enrolled in any class yet. Ask your teacher to add you!
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 stagger-children">
                            {classes.map((cls, index) => {
                                const colors = cardColors[index % cardColors.length];
                                const pct = cls.percentage ?? 0;
                                const statusColor = pct >= 75 ? 'text-emerald-500' : pct >= 65 ? 'text-amber-500' : 'text-rose-500';
                                const statusBg = pct >= 75
                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/30'
                                    : pct >= 65
                                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30'
                                        : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/30';

                                return (
                                    <button
                                        key={cls.classId}
                                        type="button"
                                        onClick={() => navigate(`/student/reports?classId=${cls.classId}`)}
                                        className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${colors.gradient} p-[1px] ${colors.shadow} shadow-lg text-left w-full group`}
                                    >
                                        <div className="bg-white dark:bg-dark-800 rounded-[15px] relative overflow-hidden h-full">
                                            {/* Colorful header bar */}
                                            <div className={`bg-gradient-to-r ${colors.gradient} px-5 py-4`}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 flex items-center justify-center text-white text-base sm:text-lg font-bold shrink-0">
                                                            {cls.classId.substring(0, 3)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h2 className="text-sm sm:text-base font-bold text-white leading-tight truncate">{cls.subject}</h2>
                                                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-white/20 text-white text-[10px] font-mono font-bold">
                                                                    🆔 {cls.classId}
                                                                </span>
                                                                <span className="text-white/70 text-[10px] truncate">{cls.teacher}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* Circular attendance ring */}
                                                    <div className="relative w-14 h-14 flex-shrink-0">
                                                        <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 36 36">
                                                            <path d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831"
                                                                fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
                                                            <path d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831"
                                                                fill="none" strokeWidth="3"
                                                                strokeDasharray={`${pct}, 100`}
                                                                stroke="white"
                                                                strokeLinecap="round"
                                                                className="transition-all duration-1000 ease-out" />
                                                        </svg>
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <span className="text-xs font-extrabold text-white">{pct}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Card body */}
                                            <div className="p-5">
                                                <div className="grid grid-cols-3 gap-3 mb-4">
                                                    <div className="text-center rounded-xl bg-gray-50 dark:bg-dark-700 py-3">
                                                        <p className="text-lg font-extrabold text-emerald-500">{cls.presentCount ?? '--'}</p>
                                                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">Present</p>
                                                    </div>
                                                    <div className="text-center rounded-xl bg-gray-50 dark:bg-dark-700 py-3">
                                                        <p className={`text-lg font-extrabold ${statusColor}`}>{cls.totalSessions ?? '--'}</p>
                                                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">Total</p>
                                                    </div>
                                                    <div className="text-center rounded-xl bg-gray-50 dark:bg-dark-700 py-3">
                                                        <p className="text-lg font-extrabold text-purple-500">{cls.semesterProgress ?? '--'}%</p>
                                                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">Semester</p>
                                                    </div>
                                                </div>

                                                {/* Status badge */}
                                                <div className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${statusBg}`}>
                                                    <span className={`text-sm font-semibold ${statusColor}`}>
                                                        {pct >= 75 ? '✅ Good Standing' : pct >= 65 ? '⚠️ Warning' : '🚨 Critical'}
                                                    </span>
                                                    <span className="text-xs text-gray-400 group-hover:text-indigo-400 transition-colors flex items-center gap-1">
                                                        View Report
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                        </svg>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Subjects;

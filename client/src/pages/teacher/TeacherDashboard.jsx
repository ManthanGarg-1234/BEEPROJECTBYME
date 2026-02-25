import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import api from '../../api';

const TeacherDashboard = () => {
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [stats, setStats] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const quickNav = [
        { label: 'Dashboard', path: '/teacher/dashboard', icon: '📊' },
        { label: 'Classes', path: '/teacher/classes', icon: '📚' },
        { label: 'Session', path: '/teacher/session', icon: '🎯' },
        { label: 'Manual', path: '/teacher/manual-attendance', icon: '✏️' },
        { label: 'Reports', path: '/teacher/reports', icon: '📈' },
    ];

    const assignedSubjects = [
        { code: 'CSE201', name: 'Data Structures & Algorithms', semester: 'III', groups: ['CSE-A', 'CSE-B'] },
        { code: 'CSE252', name: 'Operating Systems', semester: 'V', groups: ['CSE-B'] },
        { code: 'CSE341', name: 'Computer Networks', semester: 'VI', groups: ['CSE-A'] },
        { code: 'CSE368', name: 'DBMS Lab', semester: 'IV', groups: ['CSE-A', 'CSE-C'] },
    ];

    const assignedGroups = [
        { group: 'CSE-A', year: '2nd Year', strength: 62, mentor: true },
        { group: 'CSE-B', year: '2nd Year', strength: 58, mentor: false },
        { group: 'CSE-C', year: '2nd Year', strength: 55, mentor: false },
    ];

    useEffect(() => { fetchClasses(); }, []);

    useEffect(() => {
        if (selectedClass) {
            fetchDashboard(selectedClass);
            fetchChart(selectedClass);
        }
    }, [selectedClass]);

    const fetchClasses = async () => {
        try {
            const res = await api.get('/classes');
            setClasses(res.data);
            if (res.data.length > 0) setSelectedClass(res.data[0].classId);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fetchDashboard = async (classId) => {
        try { const res = await api.get(`/analytics/dashboard/${classId}`); setStats(res.data); }
        catch (err) { console.error(err); }
    };

    const fetchChart = async (classId) => {
        try { const res = await api.get(`/analytics/daily-chart/${classId}`); setChartData(res.data); }
        catch (err) { console.error(err); }
    };

    if (loading) {
        return (
            <div className="page-container">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-36 rounded-2xl skeleton"></div>
                    ))}
                </div>
                <div className="mt-8 h-72 skeleton rounded-2xl"></div>
            </div>
        );
    }

    if (classes.length === 0) {
        return (
            <div className="page-container">
                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
                    <aside className="glass-card-solid p-5 h-fit lg:sticky lg:top-24">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-r from-cyan-500 to-lime-400 flex items-center justify-center text-white text-lg shadow-lg shadow-cyan-500/30">
                                🧭
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/80">Control Hub</p>
                                <h2 className="text-lg font-bold text-white">Teacher Sidebar</h2>
                            </div>
                        </div>

                        <div className="space-y-3 mb-6">
                            {quickNav.map((item) => (
                                <button
                                    key={item.path}
                                    type="button"
                                    onClick={() => navigate(item.path)}
                                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700/50 text-slate-200 hover:border-cyan-300/60 hover:text-white transition-all duration-300"
                                >
                                    <span className="flex items-center gap-2 text-sm font-medium">
                                        <span className="text-lg">{item.icon}</span>
                                        {item.label}
                                    </span>
                                    <span className="text-xs text-slate-400">→</span>
                                </button>
                            ))}
                        </div>

                        <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 text-sm text-slate-300">
                            Add your first class to unlock analytics, sessions, and reports.
                        </div>
                    </aside>

                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-1">
                        <div className="bg-white dark:bg-dark-800 rounded-[22px] p-12 text-center relative overflow-hidden">
                            {/* SVG Illustration */}
                            <div className="relative mx-auto w-48 h-48 mb-6">
                                <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="100" cy="100" r="80" fill="url(#emptyGrad)" opacity="0.1" />
                                    <rect x="60" y="50" width="80" height="100" rx="8" fill="url(#emptyGrad)" opacity="0.2" />
                                    <rect x="70" y="65" width="45" height="4" rx="2" fill="#818cf8" />
                                    <rect x="70" y="75" width="35" height="4" rx="2" fill="#a78bfa" />
                                    <rect x="70" y="85" width="50" height="4" rx="2" fill="#818cf8" />
                                    <rect x="70" y="100" width="20" height="20" rx="4" fill="#c084fc" opacity="0.3" />
                                    <path d="M76 110L80 114L88 106" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <rect x="95" y="100" width="20" height="20" rx="4" fill="#818cf8" opacity="0.3" />
                                    <rect x="70" y="125" width="55" height="4" rx="2" fill="#a78bfa" opacity="0.5" />
                                    <circle cx="155" cy="55" r="15" fill="#fbbf24" opacity="0.8" />
                                    <path d="M150 55L154 59L160 51" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                    <defs>
                                        <linearGradient id="emptyGrad" x1="0" y1="0" x2="200" y2="200">
                                            <stop stopColor="#667eea" />
                                            <stop offset="1" stopColor="#a855f7" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                            </div>

                            <h2 className="text-2xl font-bold mb-2 dark:text-white relative">No Classes Yet</h2>
                            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto relative">
                                Create your first class to start tracking attendance and generate beautiful reports
                            </p>
                            <button onClick={() => navigate('/teacher/classes')} className="relative bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-purple-500/30">
                                ✨ Create Your First Class
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const statCards = [
        {
            label: 'Total Sessions',
            value: stats?.totalSessions ?? 0,
            icon: '📅',
            gradient: 'from-blue-500 to-cyan-400',
            bgLight: 'from-blue-50 to-cyan-50',
            shadowColor: 'shadow-blue-500/20',
            iconBg: 'bg-blue-400/20',
            helper: 'Sessions conducted for this class',
        },
        {
            label: 'Avg Attendance',
            value: `${stats?.avgAttendance ?? 0}%`,
            icon: '📊',
            gradient: 'from-emerald-500 to-teal-400',
            bgLight: 'from-emerald-50 to-teal-50',
            shadowColor: 'shadow-emerald-500/20',
            iconBg: 'bg-emerald-400/20',
            helper: 'Class average across all sessions',
        },
        {
            label: 'Total Students',
            value: stats?.totalStudents ?? 0,
            icon: '👥',
            gradient: 'from-violet-500 to-purple-400',
            bgLight: 'from-violet-50 to-purple-50',
            shadowColor: 'shadow-violet-500/20',
            iconBg: 'bg-violet-400/20',
            helper: 'Enrolled in selected class',
        },
        {
            label: 'Below 75%',
            value: stats?.belowThresholdCount ?? 0,
            icon: '⚠️',
            gradient: 'from-rose-500 to-orange-400',
            bgLight: 'from-rose-50 to-orange-50',
            shadowColor: 'shadow-rose-500/20',
            iconBg: 'bg-rose-400/20',
            helper: 'Students under the 75% rule',
        },
    ];

    const latestTrend = chartData.length > 0 ? chartData[chartData.length - 1] : null;

    return (
        <div className="page-container">
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
                <aside className="glass-card-solid p-5 h-fit lg:sticky lg:top-24">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-r from-cyan-500 to-lime-400 flex items-center justify-center text-white text-lg shadow-lg shadow-cyan-500/30">
                            🧭
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/80">Control Hub</p>
                            <h2 className="text-lg font-bold text-white">Teacher Sidebar</h2>
                        </div>
                    </div>

                    <div className="space-y-3 mb-6">
                        {quickNav.map((item) => (
                            <button
                                key={item.path}
                                type="button"
                                onClick={() => navigate(item.path)}
                                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700/50 text-slate-200 hover:border-cyan-300/60 hover:text-white transition-all duration-300"
                            >
                                <span className="flex items-center gap-2 text-sm font-medium">
                                    <span className="text-lg">{item.icon}</span>
                                    {item.label}
                                </span>
                                <span className="text-xs text-slate-400">→</span>
                            </button>
                        ))}
                    </div>

                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-slate-200 mb-3">Assigned Subjects</h3>
                        <div className="space-y-3">
                            {assignedSubjects.map((subject) => (
                                <div key={subject.code} className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold text-white">{subject.code}</p>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-200">Sem {subject.semester}</span>
                                    </div>
                                    <p className="text-xs text-slate-300 mt-1">{subject.name}</p>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {subject.groups.map((group) => (
                                            <span key={group} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700/60">
                                                {group}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-slate-200 mb-3">Allotted Groups</h3>
                        <div className="space-y-2">
                            {assignedGroups.map((group) => (
                                <div key={group.group} className="flex items-center justify-between rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2">
                                    <div>
                                        <p className="text-sm font-semibold text-white">{group.group}</p>
                                        <p className="text-xs text-slate-400">{group.year} • {group.strength} students</p>
                                    </div>
                                    {group.mentor && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-lime-500/10 text-lime-200">Mentor</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                <div>
                    {/* Header with gradient accent */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 animate-fade-in">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                    <span className="text-white text-lg">📊</span>
                                </div>
                                <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
                                    Teacher Dashboard
                                </h1>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 ml-[52px]">Real-time overview of your class performance</p>
                        </div>
                        <div className="relative">
                            <select
                                id="class-selector"
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                                className="appearance-none bg-white dark:bg-dark-700 border-2 border-indigo-200 dark:border-indigo-900/50 text-gray-800 dark:text-gray-200 rounded-xl px-5 py-3 pr-10 font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all cursor-pointer min-w-[220px]"
                            >
                                {classes.map(c => (
                                    <option key={c._id} value={c.classId}>{c.classId} - {c.subject}</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-indigo-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {stats && (
                <>
                    {/* Vibrant Gradient Stat Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8 stagger-children">
                        {statCards.map((card, i) => (
                            <div key={i} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} p-[1px] group ${card.shadowColor} shadow-lg`}>
                                <div className={`bg-white dark:bg-dark-800 rounded-[15px] p-5 h-full relative overflow-hidden`}>
                                    {/* Colored accent corner */}
                                    <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${card.gradient} opacity-10 group-hover:opacity-20 transition-opacity`}></div>
                                    <div className="flex items-center justify-between relative">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{card.label}</p>
                                                <span className="relative group">
                                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-gray-200/70 dark:border-dark-600 text-[10px] text-gray-400 dark:text-gray-300">i</span>
                                                    <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-44 rounded-lg bg-gray-900 text-white text-[11px] px-2 py-1.5 shadow-lg opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 pointer-events-none">
                                                        {card.helper}
                                                    </span>
                                                </span>
                                            </div>
                                            <p className={`text-3xl font-extrabold mt-1.5 bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent`}>
                                                {card.value}
                                            </p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{card.helper}</p>
                                        </div>
                                        <div className={`w-14 h-14 rounded-2xl ${card.iconBg} flex items-center justify-center`}>
                                            <span className="text-2xl">{card.icon}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                        Metrics reflect the selected class only. Attendance % is calculated from present records vs total sessions.
                    </div>

                    {/* Semester Progress - Colorful */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-[1px] mb-8 animate-slide-up">
                        <div className="bg-white dark:bg-dark-800 rounded-[15px] p-6 relative overflow-hidden">
                            <div className="flex justify-between items-center mb-3 relative">
                                <h3 className="font-bold dark:text-white flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm">📈</span>
                                    Semester Progress
                                </h3>
                                <span className="text-sm font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{stats.semesterProgress}%</span>
                            </div>
                            <div className="relative h-4 bg-gray-100 dark:bg-dark-600 rounded-full overflow-hidden">
                                <div
                                    className="absolute h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full"
                                    style={{ width: `${Math.min(stats.semesterProgress, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    {/* Daily Chart - Colorful */}
                    {chartData.length > 0 && (
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-400 p-[1px] mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                            <div className="bg-white dark:bg-dark-800 rounded-[15px] p-6 relative overflow-hidden">
                                <div className="flex items-center justify-between mb-5">
                                    <h3 className="font-bold dark:text-white flex items-center gap-2 relative">
                                    <span className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-400 flex items-center justify-center text-white text-sm">📈</span>
                                    Daily Attendance Trend
                                    </h3>
                                    {latestTrend && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            Latest: {latestTrend.percentage}% on {latestTrend.date}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mb-4">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Each point shows the class-wide attendance percentage for a session date.
                                    </p>
                                    <span className="relative group">
                                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-gray-200/70 dark:border-dark-600 text-[10px] text-gray-400 dark:text-gray-300">i</span>
                                        <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-52 rounded-lg bg-gray-900 text-white text-[11px] px-2 py-1.5 shadow-lg opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 pointer-events-none">
                                            Trend is computed from attendance records for the selected class only.
                                        </span>
                                    </span>
                                </div>
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorPercent" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                                        <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#9ca3af" fontSize={12} domain={[0, 100]} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#fff',
                                                border: '2px solid #6366f1',
                                                borderRadius: '12px',
                                                color: '#1f2937',
                                                boxShadow: '0 10px 30px rgba(99,102,241,0.15)'
                                            }}
                                        />
                                        <Area type="monotone" dataKey="percentage" stroke="#6366f1" strokeWidth={3} fill="url(#colorPercent)" name="Attendance %"
                                            dot={{ r: 4, fill: '#6366f1', strokeWidth: 3, stroke: '#fff' }}
                                            activeDot={{ r: 7, strokeWidth: 0, fill: '#6366f1' }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Student Stats Table - Colorful */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-500 to-purple-400 p-[1px] animate-slide-up" style={{ animationDelay: '0.2s' }}>
                        <div className="bg-white dark:bg-dark-800 rounded-[15px] p-6 relative overflow-hidden">
                            <div className="flex justify-between items-center mb-5">
                                <h3 className="font-bold dark:text-white flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-lg bg-gradient-to-r from-violet-500 to-purple-400 flex items-center justify-center text-white text-sm">👥</span>
                                    Student-wise Summary
                                </h3>
                                <button
                                    onClick={() => navigate('/teacher/reports')}
                                    className="bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm px-5 py-2 rounded-xl font-semibold shadow-md shadow-purple-500/20 transition-shadow duration-200 flex items-center gap-1.5"
                                >
                                    Full Report
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </button>
                            </div>
                            <div className="overflow-x-auto rounded-xl">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20">
                                            <th className="text-left py-3.5 px-4 text-violet-600 dark:text-violet-400 font-semibold text-xs uppercase tracking-wider">Roll No</th>
                                            <th className="text-left py-3.5 px-4 text-violet-600 dark:text-violet-400 font-semibold text-xs uppercase tracking-wider">Name</th>
                                            <th className="text-center py-3.5 px-4 text-violet-600 dark:text-violet-400 font-semibold text-xs uppercase tracking-wider">Present</th>
                                            <th className="text-center py-3.5 px-4 text-violet-600 dark:text-violet-400 font-semibold text-xs uppercase tracking-wider">Total</th>
                                            <th className="text-center py-3.5 px-4 text-violet-600 dark:text-violet-400 font-semibold text-xs uppercase tracking-wider">%</th>
                                            <th className="text-center py-3.5 px-4 text-violet-600 dark:text-violet-400 font-semibold text-xs uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-dark-700">
                                        {stats.studentStats?.map((s, idx) => (
                                            <tr key={s._id} className="hover:bg-violet-50/50 dark:hover:bg-violet-900/10 transition-colors duration-200">
                                                <td className="py-3.5 px-4 font-mono text-xs text-gray-600 dark:text-gray-300">{s.rollNumber}</td>
                                                <td className="py-3.5 px-4 dark:text-white font-medium">{s.name}</td>
                                                <td className="py-3.5 px-4 text-center">
                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                                                        {s.presentCount}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 text-center dark:text-gray-300">{s.totalSessions}</td>
                                                <td className="py-3.5 px-4 text-center">
                                                    <span className={`font-extrabold ${s.percentage >= 75 ? 'text-emerald-500' : s.percentage >= 65 ? 'text-amber-500' : 'text-rose-500'}`}>
                                                        {s.percentage}%
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 text-center">
                                                    {s.warningLevel ? (
                                                        <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${s.warningLevel === 'Critical'
                                                            ? 'bg-gradient-to-r from-rose-100 to-red-100 dark:from-rose-900/30 dark:to-red-900/30 text-rose-600 dark:text-rose-400'
                                                            : 'bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 text-amber-600 dark:text-amber-400'
                                                            }`}>
                                                            {s.warningLevel === 'Critical' ? '🔴' : '🟡'} {s.warningLevel}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 text-emerald-600 dark:text-emerald-400">
                                                            🟢 Good
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            )}
                </div>
            </div>
        </div>
    );
};

export default TeacherDashboard;

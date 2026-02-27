import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    AreaChart, Area, LineChart, Line
} from 'recharts';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';

const STATUS_COLORS = { Present: '#10b981', Late: '#f59e0b', Absent: '#ef4444' };

const StatCard = ({ label, value, color, icon }) => (
    <div className={`glass-card-solid p-3 sm:p-5 flex items-center gap-3 sm:gap-4 border-l-4`} style={{ borderColor: color }}>
        <div className="text-2xl sm:text-3xl">{icon}</div>
        <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-extrabold" style={{ color }}>{value}</p>
            <p className="text-xs text-gray-400 font-medium mt-0.5 truncate">{label}</p>
        </div>
    </div>
);

const AttendanceReport = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [classes, setClasses] = useState([]);
    const [selectedId, setSelectedId] = useState('');
    const [records, setRecords] = useState([]);
    const [groupDaily, setGroupDaily] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reportLoading, setReportLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'group'

    const quickNav = [
        { label: 'Dashboard', path: '/student/dashboard', icon: '📊' },
        { label: 'Subjects', path: '/student/subjects', icon: '📚' },
        { label: 'Scan QR', path: '/student/scan', icon: '📷' },
        { label: 'Reports', path: '/student/reports', icon: '📈' },
    ];

    const photoUrl = user?.profilePhoto
        ? `${import.meta.env.VITE_API_URL || ''}/uploads/profiles/${user.profilePhoto}`
        : '';

    // ── Load class list ──────────────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res = await api.get('/analytics/student-dashboard');
                const list = res.data?.classes || [];
                setClasses(list);
                const q = new URLSearchParams(location.search).get('classId');
                setSelectedId(q || list[0]?.classId || '');
            } catch { /* ignore */ } finally { setLoading(false); }
        })();
    }, [location.search]);

    // ── Load records + group stats when class changes ────────────────────────
    useEffect(() => {
        if (!selectedId) return;
        (async () => {
            setReportLoading(true);
            try {
                const [rRec, rGroup] = await Promise.all([
                    api.get(`/attendance/student/${selectedId}`),
                    api.get(`/analytics/class-daily/${selectedId}`),
                ]);
                setRecords(rRec.data || []);
                setGroupDaily(rGroup.data?.daily || []);
            } catch { setRecords([]); setGroupDaily([]); }
            finally { setReportLoading(false); }
        })();
    }, [selectedId]);

    const selectedClass = useMemo(() => classes.find(c => c.classId === selectedId), [classes, selectedId]);

    // ── Derived personal stats ────────────────────────────────────────────────
    const summary = useMemo(() => records.reduce((a, r) => {
        if (r.status === 'Present') a.present++;
        else if (r.status === 'Late') a.late++;
        else a.absent++;
        return a;
    }, { present: 0, late: 0, absent: 0 }), [records]);

    const total = summary.present + summary.late + summary.absent;
    const pct = total ? Math.round(((summary.present + summary.late) / total * 100) * 10) / 10 : 0;

    const pieData = useMemo(() => [
        { name: 'Present', value: summary.present },
        { name: 'Late', value: summary.late },
        { name: 'Absent', value: summary.absent },
    ], [summary]);

    const sortedRecords = useMemo(() =>
        [...records].sort((a, b) =>
            new Date(a.session?.startTime || a.markedAt) - new Date(b.session?.startTime || b.markedAt)
        ), [records]);

    const trendData = useMemo(() => {
        let p = 0, t = 0;
        return sortedRecords.map(r => {
            t++; if (r.status === 'Present' || r.status === 'Late') p++;
            const date = r.session?.startTime
                ? new Date(r.session.startTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                : new Date(r.markedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
            return { date, pct: Math.round((p / t) * 1000) / 10 };
        });
    }, [sortedRecords]);

    // ── Loading / empty states ────────────────────────────────────────────────
    if (loading) return (
        <div className="page-container">
            <div className="space-y-6">
                <div className="h-12 w-64 skeleton rounded-xl"></div>
                {[1, 2, 3].map(i => <div key={i} className="h-48 skeleton rounded-2xl"></div>)}
            </div>
        </div>
    );

    if (!classes.length) return (
        <div className="page-container">
            <div className="glass-card-solid p-8 text-center">
                <h2 className="text-xl font-bold text-white mb-2">No Subjects Yet</h2>
                <p className="text-slate-400">Ask your teacher to enroll you in a class.</p>
            </div>
        </div>
    );

    const Sidebar = () => (
        <aside className="glass-card-solid p-5 h-fit lg:sticky lg:top-24">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-lg shadow-lg shadow-purple-500/30">📚</div>
                <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-purple-200/80">Student Hub</p>
                    <h2 className="text-lg font-bold text-white">My Dashboard</h2>
                </div>
            </div>

            <div className="space-y-3 mb-6">
                {quickNav.map(item => (
                    <button key={item.path} type="button" onClick={() => navigate(item.path)}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border text-slate-200 transition-all duration-300 ${location.pathname === item.path
                            ? 'border-purple-300/70 bg-purple-500/10 text-white'
                            : 'border-slate-700/50 bg-slate-900/60 hover:border-purple-300/60 hover:text-white'}`}>
                        <span className="flex items-center gap-2 text-sm font-medium">
                            <span className="text-lg">{item.icon}</span>{item.label}
                        </span>
                        <span className="text-xs text-slate-400">→</span>
                    </button>
                ))}
            </div>

            <h3 className="text-sm font-semibold text-slate-200 mb-3">My Subjects</h3>
            <div className="space-y-2">
                {classes.map(cls => (
                    <button key={cls.classId} type="button" onClick={() => setSelectedId(cls.classId)}
                        className={`w-full text-left rounded-xl border px-3 py-2.5 transition-all duration-300 ${selectedId === cls.classId
                            ? 'border-purple-300/70 bg-purple-500/10 text-white'
                            : 'border-slate-700/60 bg-slate-900/60 text-slate-200 hover:border-purple-300/60'}`}>
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold">{cls.subject}</p>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700/60">{cls.classId}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{cls.teacher}</p>
                    </button>
                ))}
            </div>
        </aside>
    );

    return (
        <div className="page-container">
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
                <Sidebar />

                <div>
                    {/* ── Header ────────────────────────────────────────────── */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                                    <span className="text-white text-lg">📈</span>
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                                    Attendance Report
                                </h1>
                            </div>
                            {/* Student photo top-right */}
                            <div className="flex items-center gap-3 rounded-2xl border border-slate-200/20 bg-white/70 dark:bg-dark-800/70 px-3 py-2 shadow-lg shadow-purple-500/5">
                                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl overflow-hidden border border-purple-200/60 bg-slate-900/40">
                                    {photoUrl
                                        ? <img src={photoUrl} alt={user?.name} className="w-full h-full object-cover" />
                                        : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-sm font-bold">
                                            {user?.name?.charAt(0)?.toUpperCase() || 'S'}
                                        </div>}
                                </div>
                                <div className="hidden sm:block">
                                    <p className="text-xs uppercase tracking-[0.2em] text-purple-500/80">Student</p>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{user?.name}</p>
                                </div>
                            </div>
                        </div>
                        {/* Subject + classId row */}
                        <div className="flex items-center gap-2 flex-wrap ml-[52px]">
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                {selectedClass ? selectedClass.subject : 'Select a subject'}
                            </p>
                            {selectedClass && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono font-semibold">
                                    🆔 {selectedClass.classId}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* ── Tab switcher ───────────────────────────────────────── */}
                    <div className="overflow-x-auto pb-1 -mx-1 px-1 mb-6">
                        <div className="flex gap-2 min-w-max">
                            {[
                                { id: 'personal', label: '🎓 My Analytics' },
                                { id: 'group', label: '👥 Group Analytics' },
                            ].map(t => (
                                <button key={t.id} onClick={() => setActiveTab(t.id)}
                                    className={`px-4 sm:px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap ${activeTab === t.id
                                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-purple-500/25'
                                        : 'glass-card-solid text-slate-300 hover:text-white'}`}>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {reportLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => <div key={i} className="h-48 skeleton rounded-2xl"></div>)}
                        </div>
                    ) : activeTab === 'personal' ? (
                        <PersonalTab summary={summary} total={total} pct={pct}
                            pieData={pieData} trendData={trendData} sortedRecords={sortedRecords} />
                    ) : (
                        <GroupTab groupDaily={groupDaily} selectedClass={selectedClass} />
                    )}
                </div>
            </div>
        </div>
    );
};

/* ════════════════════════════════════════════════════
   Personal Analytics Tab
════════════════════════════════════════════════════ */
const PersonalTab = ({ summary, total, pct, pieData, trendData, sortedRecords }) => {
    const statusColor = pct >= 75 ? '#10b981' : pct >= 65 ? '#f59e0b' : '#ef4444';

    return (
        <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Present" value={summary.present} color="#10b981" icon="✅" />
                <StatCard label="Late" value={summary.late} color="#f59e0b" icon="⏰" />
                <StatCard label="Absent" value={summary.absent} color="#ef4444" icon="❌" />
                <StatCard label="Attendance %" value={`${pct}%`} color={statusColor} icon="📊" />
            </div>

            {/* Attendance % ring + warning */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="glass-card-solid p-6 flex flex-col items-center justify-center">
                    <div className="relative w-40 h-40 mb-3">
                        <svg className="w-40 h-40 -rotate-90" viewBox="0 0 36 36">
                            <path d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831"
                                fill="none" stroke="#1e293b" strokeWidth="3" />
                            <path d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831"
                                fill="none" strokeWidth="3"
                                strokeDasharray={`${pct}, 100`}
                                stroke={statusColor}
                                strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-extrabold" style={{ color: statusColor }}>{pct}%</span>
                            <span className="text-xs text-slate-400">Attendance</span>
                        </div>
                    </div>
                    <p className="text-sm font-semibold" style={{ color: statusColor }}>
                        {pct >= 75 ? '✅ Good Standing' : pct >= 65 ? '⚠️ At Risk' : '🚨 Critical — Below 75%'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{total} total sessions</p>
                </div>

                {/* Pie chart */}
                <div className="glass-card-solid p-5">
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">Status Distribution</h3>
                    <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} dataKey="value" nameKey="name"
                                    outerRadius={75} innerRadius={40} paddingAngle={3}>
                                    {pieData.map(entry => (
                                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#e2e8f0' }} />
                                <Legend iconType="circle" iconSize={10}
                                    formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Bar chart — sessions by status */}
            <div className="glass-card-solid p-5">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">📊 Sessions by Status</h3>
                <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                            { label: 'Present', count: summary.present },
                            { label: 'Late', count: summary.late },
                            { label: 'Absent', count: summary.absent },
                        ]}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#e2e8f0' }} />
                            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                {[{ color: '#10b981' }, { color: '#f59e0b' }, { color: '#ef4444' }].map((c, i) => (
                                    <Cell key={i} fill={c.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Attendance trend line */}
            {trendData.length > 0 && (
                <div className="glass-card-solid p-5">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4">📈 Cumulative Attendance Trend</h3>
                    <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                                <Tooltip formatter={(v) => [`${v}%`, 'Attendance']}
                                    contentStyle={{ background: '#1e293b', border: '1px solid #6366f1', borderRadius: 8, color: '#e2e8f0' }} />
                                <Area type="monotone" dataKey="pct" stroke="#6366f1" strokeWidth={3}
                                    fill="url(#trendGrad)"
                                    dot={{ r: 3, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 6 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Day-by-day session history */}
            <div className="glass-card-solid p-6">
                <h3 className="font-semibold dark:text-white mb-4">📋 Day-by-Day Session History</h3>
                {sortedRecords.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">No records yet.</p>
                ) : (
                    <>
                        {/* Calendar-style grid */}
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 mb-6">
                            {sortedRecords.map((rec, i) => {
                                const date = rec.session?.startTime
                                    ? new Date(rec.session.startTime)
                                    : new Date(rec.markedAt);
                                const bg = rec.status === 'Present' ? 'bg-emerald-500' : rec.status === 'Late' ? 'bg-amber-500' : 'bg-rose-500';
                                return (
                                    <div key={i} title={`${date.toLocaleDateString()} — ${rec.status}`}
                                        className={`${bg} rounded-lg aspect-square flex flex-col items-center justify-center text-white shadow cursor-default`}>
                                        <p className="text-[10px] font-bold leading-none">{date.getDate()}</p>
                                        <p className="text-[9px] opacity-80">{date.toLocaleDateString('en-GB', { month: 'short' })}</p>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex gap-4 text-xs text-slate-400 mb-4">
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span>Present</span>
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500 inline-block"></span>Late</span>
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-500 inline-block"></span>Absent</span>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto rounded-xl">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-800/60">
                                        <th className="text-left py-3 px-4 text-slate-400 font-medium">#</th>
                                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Date</th>
                                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Day</th>
                                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedRecords.map((rec, i) => {
                                        const date = rec.session?.startTime
                                            ? new Date(rec.session.startTime)
                                            : new Date(rec.markedAt);
                                        return (
                                            <tr key={rec._id} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                                                <td className="py-3 px-4 text-slate-500 text-xs">{i + 1}</td>
                                                <td className="py-3 px-4 dark:text-gray-200">{date.toLocaleDateString()}</td>
                                                <td className="py-3 px-4 text-slate-400 text-xs">{date.toLocaleDateString('en-US', { weekday: 'long' })}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${rec.status === 'Present'
                                                        ? 'bg-emerald-500/15 text-emerald-400'
                                                        : rec.status === 'Late'
                                                            ? 'bg-amber-500/15 text-amber-400'
                                                            : 'bg-rose-500/15 text-rose-400'}`}>
                                                        {rec.status === 'Present' ? '✅' : rec.status === 'Late' ? '⏰' : '❌'} {rec.status}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-xs text-slate-400">
                                                    {rec.markedAt ? new Date(rec.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

/* ════════════════════════════════════════════════════
   Group Analytics Tab
════════════════════════════════════════════════════ */
const GroupTab = ({ groupDaily, selectedClass }) => {
    if (!groupDaily.length) return (
        <div className="glass-card-solid p-8 text-center text-slate-400">No group data available yet.</div>
    );

    const totalPresent = groupDaily.reduce((s, d) => s + d.present, 0);
    const totalLate = groupDaily.reduce((s, d) => s + d.late, 0);
    const totalAbsent = groupDaily.reduce((s, d) => s + d.absent, 0);
    const grandTotal = totalPresent + totalLate + totalAbsent;
    const avgPct = groupDaily.length ? Math.round(groupDaily.reduce((s, d) => s + d.percentage, 0) / groupDaily.length * 10) / 10 : 0;

    return (
        <div className="space-y-6">
            {/* Group summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Total Present" value={totalPresent} color="#10b981" icon="✅" />
                <StatCard label="Total Late" value={totalLate} color="#f59e0b" icon="⏰" />
                <StatCard label="Total Absent" value={totalAbsent} color="#ef4444" icon="❌" />
                <StatCard label="Group Avg %" value={`${avgPct}%`} color="#6366f1" icon="📊" />
            </div>

            {/* Group pie chart */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="glass-card-solid p-5">
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">Overall Group Distribution</h3>
                    <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={[
                                    { name: 'Present', value: totalPresent },
                                    { name: 'Late', value: totalLate },
                                    { name: 'Absent', value: totalAbsent },
                                ]} dataKey="value" outerRadius={75} innerRadius={40} paddingAngle={3}>
                                    {['#10b981', '#f59e0b', '#ef4444'].map((c, i) => <Cell key={i} fill={c} />)}
                                </Pie>
                                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#e2e8f0' }} />
                                <Legend iconType="circle" iconSize={10}
                                    formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Group avg % over time */}
                <div className="glass-card-solid p-5">
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">Group Attendance % Trend</h3>
                    <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={groupDaily}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                                <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                                <Tooltip formatter={(v) => [`${v}%`, 'Group Attendance']}
                                    contentStyle={{ background: '#1e293b', border: '1px solid #22d3ee', borderRadius: 8, color: '#e2e8f0' }} />
                                <Line type="monotone" dataKey="percentage" stroke="#22d3ee" strokeWidth={2.5}
                                    dot={{ r: 3, fill: '#22d3ee' }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Stacked bar chart — day by day group present/late/absent */}
            <div className="glass-card-solid p-5">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">📅 Day-by-Day Group Attendance</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={groupDaily} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                            <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip
                                contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#e2e8f0' }}
                                formatter={(v, n) => [v, n.charAt(0).toUpperCase() + n.slice(1)]} />
                            <Legend iconType="circle" iconSize={10}
                                formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v.charAt(0).toUpperCase() + v.slice(1)}</span>} />
                            <Bar dataKey="present" stackId="a" fill="#10b981" name="present" />
                            <Bar dataKey="late" stackId="a" fill="#f59e0b" name="late" />
                            <Bar dataKey="absent" stackId="a" fill="#ef4444" name="absent" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Group daily table */}
            <div className="glass-card-solid p-4 sm:p-6">
                <h3 className="font-semibold dark:text-white mb-4">📋 Daily Group Breakdown</h3>
                <div className="overflow-x-auto -mx-1 rounded-xl">
                    <table className="w-full text-sm min-w-[420px]">
                        <thead>
                            <tr className="bg-slate-800/60">
                                <th className="text-left py-3 px-3 sm:px-4 text-slate-400 font-medium whitespace-nowrap">Date</th>
                                <th className="text-center py-3 px-3 sm:px-4 text-emerald-400 font-medium whitespace-nowrap">Present</th>
                                <th className="text-center py-3 px-3 sm:px-4 text-amber-400 font-medium whitespace-nowrap">Late</th>
                                <th className="text-center py-3 px-3 sm:px-4 text-rose-400 font-medium whitespace-nowrap">Absent</th>
                                <th className="text-center py-3 px-3 sm:px-4 text-slate-400 font-medium whitespace-nowrap">Total</th>
                                <th className="text-center py-3 px-3 sm:px-4 text-indigo-400 font-medium whitespace-nowrap">Att%</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupDaily.map((d, i) => (
                                <tr key={i} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                                    <td className="py-3 px-3 sm:px-4 dark:text-gray-200 font-medium whitespace-nowrap">
                                        {new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short' })}
                                    </td>
                                    <td className="py-3 px-3 sm:px-4 text-center font-bold text-emerald-400">{d.present}</td>
                                    <td className="py-3 px-3 sm:px-4 text-center font-bold text-amber-400">{d.late}</td>
                                    <td className="py-3 px-3 sm:px-4 text-center font-bold text-rose-400">{d.absent}</td>
                                    <td className="py-3 px-3 sm:px-4 text-center text-slate-300">{d.total}</td>
                                    <td className="py-3 px-3 sm:px-4 text-center">
                                        <span className={`font-bold ${d.percentage >= 75 ? 'text-emerald-400' : d.percentage >= 65 ? 'text-amber-400' : 'text-rose-400'}`}>
                                            {d.percentage}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-slate-800/40 font-bold">
                                <td className="py-3 px-4 text-slate-200">Total</td>
                                <td className="py-3 px-4 text-center text-emerald-400">{totalPresent}</td>
                                <td className="py-3 px-4 text-center text-amber-400">{totalLate}</td>
                                <td className="py-3 px-4 text-center text-rose-400">{totalAbsent}</td>
                                <td className="py-3 px-4 text-center text-slate-300">{grandTotal}</td>
                                <td className="py-3 px-4 text-center text-indigo-400">{avgPct}%</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AttendanceReport;

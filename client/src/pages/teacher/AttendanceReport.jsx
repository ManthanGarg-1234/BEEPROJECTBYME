import { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, AreaChart, Area, ReferenceLine,
} from 'recharts';
import api from '../../api';
import { generateTeacherInsights } from '../../utils/insightGenerator';

/* ─── constants ──────────────────────────────────────────────────────────── */
// Groups, subjects, and colors are now derived dynamically from the API response.
// See the component state: GROUPS, ALL_SUBJECTS, GROUP_COLORS.
const COLOR_PALETTE = ['#6366f1', '#22d3ee', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#14b8a6', '#a855f7', '#06b6d4'];
const SUBJECT_ICONS = { CN: '🌐', BE: '⚙️', DSOOPS: '🗂️', LINUX: '🐧', LA: '🐧', DM: '📐', MATH: '📐', DSA: '💻', OS: '🖥️', DBMS: '🗄️' };
const STATUS_COLORS = { Present: '#10b981', Late: '#f59e0b', Absent: '#ef4444' };
const TP = { contentStyle: { backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 10, color: '#e2e8f0', fontSize: 12 } };

/* ─── tiny helpers ───────────────────────────────────────────────────────── */
const fmt   = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
const pctColor = (p) => p >= 75 ? '#10b981' : p >= 65 ? '#f59e0b' : '#ef4444';

const StatCard = ({ label, value, color, icon }) => (
    <div className="glass-card-solid p-3 sm:p-4 flex items-center gap-3 border-l-4" style={{ borderColor: color }}>
        <span className="text-xl sm:text-2xl">{icon}</span>
        <div className="min-w-0">
            <p className="text-lg sm:text-xl font-extrabold" style={{ color }}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{label}</p>
        </div>
    </div>
);

const TabBtn = ({ active, onClick, children }) => (
    <button onClick={onClick}
        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap
            ${active ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-purple-500/25'
                     : 'glass-card-solid text-slate-300 hover:text-white'}`}>
        {children}
    </button>
);



/* ════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════════════════ */
const AttendanceReport = () => {
    /* teacher's own classes & subjects derived from API */
    const [myClasses,  setMyClasses]  = useState([]);
    const [mySubjects, setMySubjects] = useState([]);

    /* dynamically derived groups & subjects from the overview API */
    const [GROUPS, setGROUPS]           = useState([]);
    const [ALL_SUBJECTS, setALL_SUBJECTS] = useState([]);

    /* dynamic group colors */
    const GROUP_COLORS = useMemo(() =>
        Object.fromEntries(GROUPS.map((g, i) => [g, COLOR_PALETTE[i % COLOR_PALETTE.length]])),
    [GROUPS]);

    /* selector state */
    const [subCode, setSubCode] = useState('');
    const [mainTab, setMainTab] = useState('overview'); // overview | timeline | heatmap
    const [heatmapClass, setHeatmapClass] = useState('');

    /* data */
    const [overview, setOverview] = useState(null);
    const [subjectDaily, setSubjectDaily] = useState(null);
    const [heatmapData, setHeatmapData] = useState(null);

    /* loading */
    const [loadingOv, setLoadingOv] = useState(true);
    const [loadingSub, setLoadingSub] = useState(false);
    const [loadingHeat, setLoadingHeat] = useState(false);

    /* ── load teacher's own classes first, then derive subjects ──────────── */
    useEffect(() => {
        api.get('/classes').then(r => {
            const classes = r.data;
            setMyClasses(classes);
            // classId format: GROUP-CODE e.g. G22-DM
            const codes = [...new Set(classes.map(c => {
                const dashIdx = c.classId.indexOf('-');
                return dashIdx !== -1 ? c.classId.substring(dashIdx + 1) : c.classId;
            }))];
            const filtered = codes.map(code => {
                const cls = classes.find(c => c.classId.endsWith('-' + code));
                return { code, name: cls?.subject || code, icon: SUBJECT_ICONS[code] || '📖' };
            });
            setMySubjects(filtered);
            if (filtered.length > 0) {
                setSubCode(filtered[0].code);
                const firstClass = classes.find(c => c.classId.endsWith('-' + filtered[0].code));
                setHeatmapClass(firstClass?.classId || '');
            }
            // Fetch overview immediately after we know which classes the teacher has
            api.get('/analytics/group-overview')
                .then(r2 => {
                    setOverview(r2.data);
                    // Derive GROUPS and ALL_SUBJECTS from the API response
                    if (r2.data.groups) setGROUPS(r2.data.groups);
                    if (r2.data.subjects) {
                        setALL_SUBJECTS(r2.data.subjects.map(s => ({
                            ...s,
                            icon: SUBJECT_ICONS[s.code] || '📖'
                        })));
                    }
                })
                .catch(console.error)
                .finally(() => setLoadingOv(false));
        }).catch(() => setLoadingOv(false));
    }, []);

    /* ── fetch subject-daily when subCode changes ───────────────────────── */
    useEffect(() => {
        if (!subCode) return;
        setLoadingSub(true);
        setSubjectDaily(null);
        api.get(`/analytics/group-subject-daily/${subCode}`)
            .then(r => { setSubjectDaily(r.data); })
            .catch(console.error)
            .finally(() => setLoadingSub(false));
    }, [subCode]);

    /* ── fetch heatmap ──────────────────────────────────────────────────── */
    useEffect(() => {
        if (mainTab !== 'heatmap') return;
        setLoadingHeat(true);
        setHeatmapData(null);
        api.get(`/analytics/heatmap/${heatmapClass}`)
            .then(r => setHeatmapData(r.data))
            .catch(console.error)
            .finally(() => setLoadingHeat(false));
    }, [mainTab, heatmapClass]);



    /* ── derived: overview matrix row for current subject ──────────────── */
    const subMatrix = useMemo(() => {
        if (!overview) return null;
        return overview.matrix?.[subCode] ?? null;
    }, [overview, subCode]);

    /* ── derived: compare-groups chart data (overall pct per group) ──── */
    const compareData = useMemo(() => {
        if (!subMatrix) return [];
        return GROUPS.map(g => ({
            group: g,
            present: subMatrix[g]?.present ?? 0,
            late:    subMatrix[g]?.late    ?? 0,
            absent:  subMatrix[g]?.absent  ?? 0,
            pct:     subMatrix[g]?.pct     ?? 0,
        }));
    }, [subMatrix]);

    /* ── derived: merged daily chart (stacked bars, all groups) ─────────── */
    const mergedDaily = useMemo(() => {
        if (!subjectDaily) return [];
        const map = {};
        GROUPS.forEach(g => {
            (subjectDaily.daily?.[g] || []).forEach(d => {
                if (!map[d.date]) map[d.date] = { date: d.date };
                map[d.date][`${g}_pct`] = d.pct;
            });
        });
        return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
    }, [subjectDaily]);

    /* ── derived: stats for overview tab ──────────────────────────────── */
    const overviewStats = useMemo(() => {
        if (!subMatrix || !overview) return null;

        const totals = GROUPS.reduce((a, g) => {
            const d = subMatrix[g];
            if (!d) return a;
            a.present += d.present;
            a.late += d.late;
            a.absent += d.absent;
            a.total += d.total;
            a.totalStudents += d.totalStudents || 0;
            a.totalSessions += d.totalSessions || 0;
            return a;
        }, { present: 0, late: 0, absent: 0, total: 0, totalStudents: 0, totalSessions: 0 });

        const avgPct = totals.total > 0 ? Math.round(((totals.present + totals.late) / totals.total) * 1000) / 10 : 0;
        const atRiskCount = compareData.filter(d => d.pct < 75).length;

        return {
            totalStudents: totals.totalStudents,
            avgAttendance: avgPct,
            totalSessions: totals.totalSessions,
            atRiskCount,
            bestGroup: compareData.reduce((max, curr) => (curr.pct > max.pct ? curr : max), compareData[0]),
            worstGroup: compareData.reduce((min, curr) => (curr.pct < min.pct ? curr : min), compareData[0]),
            lastSessionPct: mergedDaily.length > 0 ? mergedDaily[mergedDaily.length - 1][`${GROUPS[0]}_pct`] || 0 : 0,
        };
    }, [subMatrix, overview, compareData, mergedDaily]);

    /* ── calculate risk distribution ────────────────────────────────── */
    const riskDistribution = useMemo(() => {
        if (!compareData.length) return { low: 0, medium: 0, high: 0, critical: 0 };
        return compareData.reduce((acc, g) => {
            if (g.pct >= 80) acc.low++;
            else if (g.pct >= 75) acc.medium++;
            else if (g.pct >= 65) acc.high++;
            else acc.critical++;
            return acc;
        }, { low: 0, medium: 0, high: 0, critical: 0 });
    }, [compareData]);

    /* ── export CSV ─────────────────────────────────────────────────────── */
    const exportCSV = async () => {
        try {
            const firstGroup = GROUPS[0] || '';
            const classId = firstGroup ? `${firstGroup}-${subCode}` : subCode;
            const r = await api.get(`/analytics/csv/${classId}`, { responseType: 'blob' });
            const url = URL.createObjectURL(r.data);
            const a = document.createElement('a'); a.href = url;
            a.download = `attendance_${subCode}.csv`; a.click();
            URL.revokeObjectURL(url);
        } catch { alert('CSV export failed'); }
    };

    /* ── subject selector bar (only teacher's subjects) ────────────────── */
    const SubjectBar = () => (
        <div className="overflow-x-auto pb-1 -mx-1 px-1 mb-6">
            <div className="flex gap-2 min-w-max">
                {mySubjects.map(s => (
                    <button key={s.code} onClick={() => setSubCode(s.code)}
                        className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 whitespace-nowrap
                            ${subCode === s.code
                                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-purple-500/30'
                                : 'glass-card-solid text-slate-300 hover:text-white'}`}>
                        <span>{s.icon}</span>{s.name}
                        <span className="font-mono text-[10px] opacity-60">{s.code}</span>
                    </button>
                ))}
            </div>
        </div>
    );

    /* ── main tab bar ────────────────────────────────────────────────────── */
    const MainTabBar = () => (
        <div className="overflow-x-auto pb-1 -mx-1 px-1 mb-6">
            <div className="flex gap-2 min-w-max">
                {[
                    { id: 'overview', label: '📊 Class Overview' },
                    { id: 'timeline', label: '📅 Session Timeline' },
                    { id: 'heatmap', label: '🌡 Student Heatmap' },
                ].map(t => <TabBtn key={t.id} active={mainTab === t.id} onClick={() => setMainTab(t.id)}>{t.label}</TabBtn>)}
                <button onClick={exportCSV}
                    className="px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold glass-card-solid text-slate-300 hover:text-white transition-all whitespace-nowrap">
                    📥 CSV
                </button>
            </div>
        </div>
    );

    /* ════════════════════════════════════════════════════════════════════
       CLASS OVERVIEW TAB
    ════════════════════════════════════════════════════════════════════ */
    const OverviewTab = () => {
        if (loadingOv || loadingSub) return <Skeleton />;
        if (!subMatrix || !overview || !overviewStats) return <NoData msg="No data available." />;

        const insights = generateTeacherInsights(overviewStats, mergedDaily);

        return (
            <div className="space-y-6">
                {/* 4 Smart Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatCard 
                        label="Total Students" 
                        value={overviewStats.totalStudents} 
                        color="#6366f1" 
                        icon="👥" 
                    />
                    <StatCard 
                        label="Avg Attendance %" 
                        value={`${overviewStats.avgAttendance}%`} 
                        color={pctColor(overviewStats.avgAttendance)} 
                        icon="📈" 
                    />
                    <StatCard 
                        label="Sessions Conducted" 
                        value={overviewStats.totalSessions} 
                        color="#10b981" 
                        icon="📅" 
                    />
                    <StatCard 
                        label="At-Risk Students" 
                        value={overviewStats.atRiskCount} 
                        color={overviewStats.atRiskCount > 0 ? '#f59e0b' : '#10b981'} 
                        icon="⚠️" 
                    />
                </div>

                {/* Auto-Generated Insight Box */}
                {insights.length > 0 && (
                    <div className="glass-card-solid p-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5">
                        <h3 className="text-sm font-semibold text-indigo-300 mb-3">💡 Key Insights</h3>
                        <div className="space-y-2">
                            {insights.map((insight, i) => (
                                <p key={i} className="text-sm text-slate-300 leading-relaxed">
                                    • {insight}
                                </p>
                            ))}
                        </div>
                    </div>
                )}

                {/* Large Bar Chart - Attendance % per Group */}
                <div className="glass-card-solid p-6 rounded-2xl">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4">📊 Group Attendance % Comparison</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={compareData} margin={{ left: 0, right: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="group" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                                <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="5 5" label={{ value: '75% Threshold', position: 'right', fill: '#ef4444', fontSize: 11 }} />
                                <Tooltip {...TP} formatter={(v) => [`${v}%`, 'Attendance']} />
                                <Bar dataKey="pct" radius={[6, 6, 0, 0]} name="Attendance %">
                                    {compareData.map(e => (
                                        <Bar key={e.group} dataKey="pct" fill={GROUP_COLORS[e.group]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Student Performance Table */}
                <div className="glass-card-solid p-6 rounded-2xl">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4">👥 Group Performance</h3>
                    <div className="overflow-x-auto rounded-xl">
                        <table className="w-full text-sm min-w-[500px]">
                            <thead>
                                <tr className="bg-slate-800/60">
                                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Group</th>
                                    <th className="text-center py-3 px-4 text-slate-400 font-medium">Students</th>
                                    <th className="text-center py-3 px-4 text-slate-400 font-medium">Attendance %</th>
                                    <th className="text-center py-3 px-4 text-slate-400 font-medium">Status</th>
                                    <th className="text-center py-3 px-4 text-slate-400 font-medium">Present</th>
                                    <th className="text-center py-3 px-4 text-slate-400 font-medium">Late</th>
                                    <th className="text-center py-3 px-4 text-slate-400 font-medium">Absent</th>
                                </tr>
                            </thead>
                            <tbody>
                                {GROUPS.map(g => {
                                    const d = subMatrix[g];
                                    if (!d) return null;
                                    const status = d.pct >= 75 ? '✅ Good' : d.pct >= 65 ? '⚠️ Risk' : '🚨 Critical';
                                    return (
                                        <tr key={g} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                            <td className="py-3 px-4 font-bold" style={{ color: GROUP_COLORS[g] }}>{g}</td>
                                            <td className="py-3 px-4 text-center text-slate-300">{d.totalStudents || 0}</td>
                                            <td className="py-3 px-4 text-center">
                                                <span className="font-bold" style={{ color: pctColor(d.pct) }}>{d.pct}%</span>
                                            </td>
                                            <td className="py-3 px-4 text-center text-sm">{status}</td>
                                            <td className="py-3 px-4 text-center text-emerald-400 font-semibold">{d.present}</td>
                                            <td className="py-3 px-4 text-center text-amber-400 font-semibold">{d.late}</td>
                                            <td className="py-3 px-4 text-center text-rose-400 font-semibold">{d.absent}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Risk Distribution Mini-Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="glass-card-solid p-4 rounded-xl border-l-4 border-green-500 bg-green-500/10">
                        <p className="text-2xl font-bold text-green-400">{riskDistribution.low}</p>
                        <p className="text-xs text-slate-400 mt-1">Low Risk (≥80%)</p>
                    </div>
                    <div className="glass-card-solid p-4 rounded-xl border-l-4 border-amber-500 bg-amber-500/10">
                        <p className="text-2xl font-bold text-amber-400">{riskDistribution.medium}</p>
                        <p className="text-xs text-slate-400 mt-1">Medium Risk (75-80%)</p>
                    </div>
                    <div className="glass-card-solid p-4 rounded-xl border-l-4 border-orange-500 bg-orange-500/10">
                        <p className="text-2xl font-bold text-orange-400">{riskDistribution.high}</p>
                        <p className="text-xs text-slate-400 mt-1">High Risk (65-75%)</p>
                    </div>
                    <div className="glass-card-solid p-4 rounded-xl border-l-4 border-red-600 bg-red-500/10">
                        <p className="text-2xl font-bold text-red-400">{riskDistribution.critical}</p>
                        <p className="text-xs text-slate-400 mt-1">Critical (&lt;65%)</p>
                    </div>
                </div>
            </div>
        );
    };

    /* ════════════════════════════════════════════════════════════════════
       SESSION TIMELINE TAB
    ════════════════════════════════════════════════════════════════════ */
    const TimelineTab = () => {
        if (loadingSub) return <Skeleton />;
        if (!subjectDaily || !mergedDaily.length) return <NoData msg="No session data." />;

        const sessionCards = useMemo(() => {
            return mergedDaily.map(d => {
                const dateObj = new Date(d.date);
                const dayName = dateObj.toLocaleDateString('en-GB', { weekday: 'long' });
                const firstGroupPct = d[`${GROUPS[0]}_pct`] || 0;
                
                // Aggregate present/late/absent across all groups
                let totalPresent = 0, totalLate = 0, totalAbsent = 0;
                GROUPS.forEach(g => {
                    const dailyForGroup = (subjectDaily.daily?.[g] || []).find(x => x.date === d.date);
                    if (dailyForGroup) {
                        totalPresent += dailyForGroup.present;
                        totalLate += dailyForGroup.late;
                        totalAbsent += dailyForGroup.absent;
                    }
                });

                return {
                    date: d.date,
                    dayName,
                    pct: firstGroupPct,
                    present: totalPresent,
                    late: totalLate,
                    absent: totalAbsent,
                };
            });
        }, [mergedDaily, subjectDaily, GROUPS]);

        return (
            <div className="space-y-6">
                {/* Large Area Chart with 75% Reference Line */}
                <div className="glass-card-solid p-6 rounded-2xl">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4">📈 Attendance Trend Over Sessions</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={mergedDaily} margin={{ left: 0, right: 8 }}>
                                <defs>
                                    {GROUPS.map(g => (
                                        <linearGradient key={g} id={`grad_${g}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={GROUP_COLORS[g]} stopOpacity={0.35} />
                                            <stop offset="95%" stopColor={GROUP_COLORS[g]} stopOpacity={0.03} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis 
                                    dataKey="date" 
                                    tickFormatter={fmt} 
                                    tick={{ fill: '#94a3b8', fontSize: 10 }} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    interval="preserveStartEnd" 
                                />
                                <YAxis 
                                    domain={[0, 100]} 
                                    tick={{ fill: '#94a3b8', fontSize: 11 }} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    unit="%" 
                                />
                                <ReferenceLine 
                                    y={75} 
                                    stroke="#ef4444" 
                                    strokeDasharray="5 5" 
                                    label={{ value: '75% Threshold', position: 'right', fill: '#ef4444', fontSize: 11 }} 
                                />
                                <Tooltip {...TP} labelFormatter={fmt} formatter={(v) => [`${v}%`]} />
                                {GROUPS.map(g => (
                                    <Area 
                                        key={g} 
                                        type="monotone" 
                                        dataKey={`${g}_pct`} 
                                        stroke={GROUP_COLORS[g]} 
                                        fill={`url(#grad_${g})`}
                                        strokeWidth={2} 
                                        dot={false} 
                                        name={`${g}_pct`} 
                                    />
                                ))}
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Session Cards Grid */}
                <div>
                    <h3 className="text-sm font-semibold text-slate-300 mb-4">📋 Per-Session Breakdown</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sessionCards.map((session, idx) => (
                            <div key={idx} className="glass-card-solid p-4 rounded-xl border border-slate-700/50">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <p className="text-sm font-bold text-white">{fmt(session.date)}</p>
                                        <p className="text-xs text-slate-500">{session.dayName}</p>
                                    </div>
                                    <span className="text-2xl font-bold" style={{ color: pctColor(session.pct) }}>{session.pct}%</span>
                                </div>
                                <div className="flex gap-2 text-xs">
                                    <span className="flex-1 bg-emerald-500/20 text-emerald-400 font-semibold px-2 py-1 rounded text-center">
                                        ✅ {session.present}
                                    </span>
                                    <span className="flex-1 bg-amber-500/20 text-amber-400 font-semibold px-2 py-1 rounded text-center">
                                        ⏰ {session.late}
                                    </span>
                                    <span className="flex-1 bg-rose-500/20 text-rose-400 font-semibold px-2 py-1 rounded text-center">
                                        ❌ {session.absent}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    /* ════════════════════════════════════════════════════════════════════
       HEATMAP TAB
    ════════════════════════════════════════════════════════════════════ */
    const HeatmapTab = () => {
        const getStatusColor = (status) => {
            if (status === 'Present') return 'bg-green-500';
            if (status === 'Late') return 'bg-yellow-500';
            return 'bg-red-500/30';
        };

        return (
            <div className="space-y-5">
                {/* Class selector */}
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm text-slate-400 font-medium">Select class:</span>
                    <div className="flex flex-wrap gap-2">
                        {myClasses.map(cls => {
                            const cid = cls.classId;
                            return (
                                <button key={cid} onClick={() => setHeatmapClass(cid)}
                                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all
                                        ${heatmapClass === cid
                                            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                                            : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700 border border-slate-700/50'}`}>
                                    {cid}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {loadingHeat ? <Skeleton h={300} /> : !heatmapData?.students?.length ? (
                    <NoData msg="No heatmap data." />
                ) : (
                    <div className="glass-card-solid p-4 sm:p-6 rounded-2xl">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
                            <h3 className="font-semibold text-white">🌡 Attendance Heatmap</h3>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-semibold">
                                🆔 {heatmapClass}
                            </span>
                        </div>
                        <div className="overflow-x-auto -mx-1">
                            <table className="text-xs min-w-max">
                                <thead>
                                    <tr>
                                        <th className="py-2 px-3 text-left text-slate-400 font-medium sticky left-0 bg-slate-900 z-10 min-w-[140px] sm:min-w-[160px]">Student</th>
                                        {heatmapData.dates?.map((d, i) => (
                                            <th key={i} className="py-2 px-1 text-center text-slate-500 font-medium"
                                                style={{ writingMode: 'vertical-lr', minWidth: 24 }}>
                                                {d.substring(5)}
                                            </th>
                                        ))}
                                        <th className="py-2 px-3 text-center text-slate-400 font-medium">%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {heatmapData.students.map((s, i) => {
                                        const p = s.sessions.filter(x => x.status === 'Present').length;
                                        const l = s.sessions.filter(x => x.status === 'Late').length;
                                        const t = s.sessions.length;
                                        const pct = t > 0 ? Math.round(((p + l) / t) * 100) : 0;
                                        return (
                                            <tr key={i} className="border-t border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                                <td className="py-2 px-3 sticky left-0 bg-slate-900 z-10">
                                                    <p className="font-semibold text-slate-200">{s.name}</p>
                                                    <p className="text-slate-500 font-mono text-[10px]">{s.rollNumber}</p>
                                                </td>
                                                {s.sessions.map((sess, j) => (
                                                    <td key={j} className="py-2 px-1 text-center" title={`${sess.date}: ${sess.status}`}>
                                                        <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-sm mx-auto ${getStatusColor(sess.status)}`}></div>
                                                    </td>
                                                ))}
                                                <td className="py-2 px-3 text-center font-bold" style={{ color: pctColor(pct) }}>{pct}%</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex items-center gap-4 sm:gap-6 mt-4 text-xs text-slate-400 flex-wrap">
                            <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-sm bg-green-500 inline-block"></span>Present</span>
                            <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-sm bg-yellow-500 inline-block"></span>Late</span>
                            <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-sm bg-red-500/30 inline-block"></span>Absent</span>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    /* ── current subject info ────────────────────────────────────────────── */
    const curSub = ALL_SUBJECTS.find(s => s.code === subCode) || mySubjects.find(s => s.code === subCode);

    // Classes for current subject
    const curSubClasses = myClasses.filter(c => {
        const dashIdx = c.classId.indexOf('-');
        return dashIdx !== -1 ? c.classId.substring(dashIdx + 1) === subCode : false;
    });

    return (
        <div className="page-container">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                        Attendance Analytics
                    </h1>
                    <p className="text-slate-400 mt-1 text-sm">
                        {curSub?.icon} {curSub?.name} · Viewing class data
                    </p>
                </div>
                {/* Active class badges */}
                {curSubClasses.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {curSubClasses.map(c => (
                            <span key={c.classId}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-semibold">
                                🆔 {c.classId}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <SubjectBar />
            <MainTabBar />

            {mainTab === 'overview' && <OverviewTab />}
            {mainTab === 'timeline' && <TimelineTab />}
            {mainTab === 'heatmap' && <HeatmapTab />}
        </div>
    );
};

/* ─── utility sub-components ──────────────────────────────────────────────── */
const Skeleton = ({ h = 200 }) => (
    <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className={`skeleton rounded-2xl`} style={{ height: h / 3 }}></div>)}
    </div>
);
const NoData = ({ msg }) => (
    <div className="glass-card-solid p-10 text-center">
        <span className="text-4xl block mb-3">📊</span>
        <p className="text-slate-400 text-sm">{msg}</p>
    </div>
);

export default AttendanceReport;

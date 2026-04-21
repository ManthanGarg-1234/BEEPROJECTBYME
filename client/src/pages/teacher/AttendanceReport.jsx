import { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
    LineChart, Line, AreaChart, Area,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import api from '../../api';

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

/* ─── Donut mini-chart ───────────────────────────────────────────────────── */
const MiniDoughnut = ({ present, late, absent }) => {
    const data = [
        { name: 'Present', value: present },
        { name: 'Late',    value: late },
        { name: 'Absent',  value: absent },
    ];
    return (
        <ResponsiveContainer width="100%" height={160}>
            <PieChart>
                <Pie data={data} dataKey="value" innerRadius={42} outerRadius={62} paddingAngle={2}>
                    {data.map(e => <Cell key={e.name} fill={STATUS_COLORS[e.name]} />)}
                </Pie>
                <Tooltip {...TP} formatter={(v, n) => [v, n]} />
            </PieChart>
        </ResponsiveContainer>
    );
};

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
    const [subCode, setSubCode]     = useState('');
    const [mainTab, setMainTab]     = useState('overview');     // overview | daily | compare | heatmap
    const [selectedDate, setSelectedDate] = useState(null);

    /* data */
    const [overview,    setOverview]    = useState(null);   // group-overview
    const [subjectDaily, setSubjectDaily] = useState(null); // group-subject-daily
    const [dayPies,      setDayPies]     = useState(null);  // group-day-pies
    const [heatmapData,  setHeatmapData] = useState(null);
    const [heatmapClass, setHeatmapClass] = useState('');

    /* loading */
    const [loadingOv, setLoadingOv]       = useState(true);
    const [loadingSub, setLoadingSub]     = useState(false);
    const [loadingPies, setLoadingPies]   = useState(false);
    const [loadingHeat, setLoadingHeat]   = useState(false);

    /* ── load teacher's own classes first, then derive subjects ──────────── */
    useEffect(() => {
        api.get('/classes').then(r => {
            const classes = r.data;
            setMyClasses(classes);
            // classId format: CODE-GROUP e.g. CN-G18
            const codes = [...new Set(classes.map(c => {
                const dashIdx = c.classId.indexOf('-');
                return dashIdx !== -1 ? c.classId.substring(0, dashIdx) : c.classId;
            }))];
            const filtered = codes.map(code => {
                const cls = classes.find(c => c.classId.startsWith(code + '-'));
                return { code, name: cls?.subject || code, icon: SUBJECT_ICONS[code] || '📖' };
            });
            setMySubjects(filtered);
            if (filtered.length > 0) {
                setSubCode(filtered[0].code);
                const firstClass = classes.find(c => c.classId.startsWith(filtered[0].code + '-'));
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
        setSelectedDate(null);
        setDayPies(null);
        api.get(`/analytics/group-subject-daily/${subCode}`)
            .then(r => { setSubjectDaily(r.data); })
            .catch(console.error)
            .finally(() => setLoadingSub(false));
    }, [subCode]);

    /* ── fetch day-pies when selectedDate changes ───────────────────────── */
    useEffect(() => {
        if (!selectedDate || !subCode) return;
        setLoadingPies(true);
        api.get(`/analytics/group-day-pies/${subCode}/${selectedDate}`)
            .then(r => setDayPies(r.data))
            .catch(console.error)
            .finally(() => setLoadingPies(false));
    }, [selectedDate, subCode]);

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
                map[d.date][`${g}_present`] = d.present;
            });
        });
        return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
    }, [subjectDaily]);

    /* ── dates list ─────────────────────────────────────────────────────── */
    const allDates = useMemo(() => subjectDaily?.dates || [], [subjectDaily]);

    /* ── export CSV ─────────────────────────────────────────────────────── */
    const exportCSV = async () => {
        try {
            const firstGroup = GROUPS[0] || '';
            const classId = firstGroup ? `${subCode}-${firstGroup}` : subCode;
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
                    { id: 'overview', label: '📊 Overview' },
                    { id: 'daily',    label: '📅 Daily Breakdown' },
                    { id: 'compare',  label: '🔀 Compare Groups' },
                    { id: 'heatmap',  label: '🌡 Heatmap' },
                ].map(t => <TabBtn key={t.id} active={mainTab === t.id} onClick={() => setMainTab(t.id)}>{t.label}</TabBtn>)}
                <button onClick={exportCSV}
                    className="px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold glass-card-solid text-slate-300 hover:text-white transition-all whitespace-nowrap">
                    📥 CSV
                </button>
            </div>
        </div>
    );

    /* ════════════════════════════════════════════════════════════════════
       OVERVIEW TAB
    ════════════════════════════════════════════════════════════════════ */
    const OverviewTab = () => {
        if (loadingOv) return <Skeleton />;
        if (!subMatrix || !overview) return <NoData msg="No data available." />;

        const totals = GROUPS.reduce((a, g) => {
            const d = subMatrix[g];
            if (!d) return a;
            a.present += d.present; a.late += d.late; a.absent += d.absent; a.total += d.total;
            return a;
        }, { present: 0, late: 0, absent: 0, total: 0 });
        const overallPct = totals.total > 0 ? Math.round(((totals.present + totals.late) / totals.total) * 1000) / 10 : 0;

        return (
            <div className="space-y-6">
                {/* Overall stat cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatCard label="Total Present"  value={totals.present}   color="#10b981" icon="✅" />
                    <StatCard label="Total Late"     value={totals.late}      color="#f59e0b" icon="⏰" />
                    <StatCard label="Total Absent"   value={totals.absent}    color="#ef4444" icon="❌" />
                    <StatCard label="Overall Att. %" value={`${overallPct}%`} color={pctColor(overallPct)} icon="📊" />
                </div>

                {/* Per-group cards with mini pie */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
                    {GROUPS.map(g => {
                        const d = subMatrix[g];
                        if (!d) return null;
                        const p = d.pct;
                        return (
                            <div key={g} className="glass-card-solid p-3 sm:p-4 rounded-2xl border border-slate-700/50">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-extrabold text-base sm:text-lg" style={{ color: GROUP_COLORS[g] }}>{g}</span>
                                    <span className="text-xs px-2 py-0.5 rounded-full text-white font-bold"
                                        style={{ background: pctColor(p) }}>{p}%</span>
                                </div>
                                <p className="text-xs text-slate-400 mb-2 sm:mb-3">{d.totalStudents} students · {d.totalSessions} sessions</p>
                                <MiniDoughnut present={d.present} late={d.late} absent={d.absent} />
                                <div className="flex justify-around text-xs mt-2">
                                    <span className="text-emerald-400 font-bold">{d.present} P</span>
                                    <span className="text-amber-400 font-bold">{d.late} L</span>
                                    <span className="text-rose-400 font-bold">{d.absent} A</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Multi-group bar: attendance % comparison */}
                <div className="glass-card-solid p-6 rounded-2xl">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4">📊 Group Attendance % Comparison</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={compareData} margin={{ left: 0, right: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="group" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                                <Tooltip {...TP} formatter={(v) => [`${v}%`, 'Attendance']} />
                                <Bar dataKey="pct" radius={[6, 6, 0, 0]} name="Attendance %">
                                    {compareData.map(e => <Cell key={e.group} fill={GROUP_COLORS[e.group]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Stacked present/late/absent per group */}
                <div className="glass-card-solid p-6 rounded-2xl">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4">📦 Present / Late / Absent per Group (total slots)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={compareData} margin={{ left: 0, right: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="group" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip {...TP} />
                                <Legend iconType="circle" iconSize={9}
                                    formatter={v => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} />
                                <Bar dataKey="present" stackId="a" fill="#10b981" name="Present" />
                                <Bar dataKey="late"    stackId="a" fill="#f59e0b" name="Late" />
                                <Bar dataKey="absent"  stackId="a" fill="#ef4444" name="Absent" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Radar chart — group comparison */}
                <div className="glass-card-solid p-6 rounded-2xl">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4">🕸 Radar — Group Attendance Profile</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={compareData}>
                                <PolarGrid stroke="#1e293b" />
                                <PolarAngleAxis dataKey="group" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#475569', fontSize: 10 }} />
                                <Radar name="Attendance %" dataKey="pct" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
                                <Tooltip {...TP} formatter={v => [`${v}%`]} />
                                <Legend iconType="circle" iconSize={9}
                                    formatter={v => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        );
    };

    /* ════════════════════════════════════════════════════════════════════
       DAILY BREAKDOWN TAB
    ════════════════════════════════════════════════════════════════════ */
    const DailyTab = () => {
        if (loadingSub) return <Skeleton />;
        if (!subjectDaily || !mergedDaily.length) return <NoData msg="No daily data." />;

        const firstGroup = subjectDaily.daily?.[GROUPS[0]] || [];

        return (
            <div className="space-y-6">
                {/* Line chart: all groups pct over time */}
                <div className="glass-card-solid p-6 rounded-2xl">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4">📈 Daily Attendance % — All Groups</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={mergedDaily} margin={{ left: 0, right: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="date" tickFormatter={fmt} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                                <Tooltip {...TP} labelFormatter={fmt} formatter={(v) => [`${v}%`]} />
                                <Legend iconType="circle" iconSize={9}
                                    formatter={v => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v.replace('_pct', '')}</span>} />
                                {GROUPS.map(g => (
                                    <Line key={g} type="monotone" dataKey={`${g}_pct`} stroke={GROUP_COLORS[g]}
                                        strokeWidth={2} dot={false} activeDot={{ r: 5 }} name={`${g}_pct`} />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Date picker — click a date to see per-group pie charts */}
                <div className="glass-card-solid p-5 rounded-2xl">
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">🗓 Select a Day for Per-Group Pie Breakdown</h3>
                    <div className="flex flex-wrap gap-2">
                        {allDates.map(d => (
                            <button key={d} onClick={() => setSelectedDate(selectedDate === d ? null : d)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150
                                    ${selectedDate === d
                                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow'
                                        : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700/70 border border-slate-700/50'}`}>
                                {fmt(d)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Per-day per-group pie charts */}
                {selectedDate && (
                    <div className="glass-card-solid p-6 rounded-2xl">
                        <h3 className="text-sm font-semibold text-slate-300 mb-4">
                            🍕 Pie Charts per Group — {fmt(selectedDate)}
                        </h3>
                        {loadingPies ? <Skeleton h={180} /> : (
                            dayPies?.pies ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                                    {GROUPS.map(g => {
                                        const d = dayPies.pies[g];
                                        if (!d) return (
                                            <div key={g} className="flex flex-col items-center p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
                                                <span className="font-bold mb-2" style={{ color: GROUP_COLORS[g] }}>{g}</span>
                                                <p className="text-xs text-slate-500">No session</p>
                                            </div>
                                        );
                                        return (
                                            <div key={g} className="flex flex-col items-center p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
                                                <div className="flex items-center justify-between w-full mb-1">
                                                    <span className="font-bold text-sm" style={{ color: GROUP_COLORS[g] }}>{g}</span>
                                                    <span className="text-xs font-bold" style={{ color: pctColor(d.pct) }}>{d.pct}%</span>
                                                </div>
                                                <MiniDoughnut present={d.present} late={d.late} absent={d.absent} />
                                                <div className="flex justify-around w-full text-[10px] mt-1">
                                                    <span className="text-emerald-400 font-bold">{d.present}P</span>
                                                    <span className="text-amber-400 font-bold">{d.late}L</span>
                                                    <span className="text-rose-400 font-bold">{d.absent}A</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : <NoData msg="No pie data." />
                        )}
                    </div>
                )}

                {/* Stacked bar per group per day (G18 shown as default) */}
                {GROUPS.map(g => {
                    const gData = subjectDaily.daily?.[g] || [];
                    if (!gData.length) return null;
                    return (
                        <div key={g} className="glass-card-solid p-5 rounded-2xl">
                            <h3 className="text-sm font-semibold mb-4" style={{ color: GROUP_COLORS[g] }}>
                                📅 {g} — Day-by-Day Attendance
                            </h3>
                            <div className="h-52">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={gData} margin={{ left: 0, right: 4 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                        <XAxis dataKey="date" tickFormatter={fmt} tick={{ fill: '#94a3b8', fontSize: 9 }}
                                            axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                        <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                        <Tooltip {...TP} labelFormatter={fmt} />
                                        <Bar dataKey="present" stackId="a" fill="#10b981" name="Present" />
                                        <Bar dataKey="late"    stackId="a" fill="#f59e0b" name="Late" />
                                        <Bar dataKey="absent"  stackId="a" fill="#ef4444" name="Absent" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    /* ════════════════════════════════════════════════════════════════════
       COMPARE GROUPS TAB
    ════════════════════════════════════════════════════════════════════ */
    const CompareTab = () => {
        if (loadingOv || loadingSub) return <Skeleton />;
        if (!subMatrix) return <NoData msg="No data." />;

        // Area chart: all subjects comparison (all GROUPS for current subject shown)
        // Also show cross-subject summary for each group (using overview matrix)
        const crossSubjectData = GROUPS.map(g => {
            const row = { group: g };
            ALL_SUBJECTS.forEach(s => {
                row[s.name] = overview?.matrix?.[s.code]?.[g]?.pct ?? 0;
            });
            return row;
        });

        return (
            <div className="space-y-6">
                {/* Grouped bar: all subjects attendance % for each group */}
                <div className="glass-card-solid p-6 rounded-2xl">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4">📊 All Subjects Attendance % by Group</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={crossSubjectData} margin={{ left: 0, right: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="group" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                                <Tooltip {...TP} formatter={(v) => [`${v}%`]} />
                                <Legend iconType="circle" iconSize={9}
                                    formatter={v => <span style={{ color: '#94a3b8', fontSize: 10 }}>{v}</span>} />
                                {ALL_SUBJECTS.map((s, i) => (
                                    <Bar key={s.code} dataKey={s.name} radius={[4, 4, 0, 0]}
                                        fill={['#6366f1','#22d3ee','#10b981','#f59e0b','#f43f5e'][i]} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Area chart overtime for current subject per group */}
                {mergedDaily.length > 0 && (
                    <div className="glass-card-solid p-6 rounded-2xl">
                        <h3 className="text-sm font-semibold text-slate-300 mb-4">
                            📈 {ALL_SUBJECTS.find(s => s.code === subCode)?.name} — Attendance % Trends per Group
                        </h3>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={mergedDaily} margin={{ left: 0, right: 8 }}>
                                    <defs>
                                        {GROUPS.map(g => (
                                            <linearGradient key={g} id={`grad_${g}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%"  stopColor={GROUP_COLORS[g]} stopOpacity={0.35} />
                                                <stop offset="95%" stopColor={GROUP_COLORS[g]} stopOpacity={0.03} />
                                            </linearGradient>
                                        ))}
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                    <XAxis dataKey="date" tickFormatter={fmt} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                    <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                                    <Tooltip {...TP} labelFormatter={fmt} formatter={(v) => [`${v}%`]} />
                                    <Legend iconType="circle" iconSize={9}
                                        formatter={v => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v.replace('_pct', '')}</span>} />
                                    {GROUPS.map(g => (
                                        <Area key={g} type="monotone" dataKey={`${g}_pct`}
                                            stroke={GROUP_COLORS[g]} fill={`url(#grad_${g})`}
                                            strokeWidth={2} dot={false} name={`${g}_pct`} />
                                    ))}
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Table: cross-subject summary */}
                <div className="glass-card-solid p-5 sm:p-6 rounded-2xl">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4">📋 Attendance % Matrix — Group × Subject</h3>
                    <div className="overflow-x-auto rounded-xl -mx-1">
                        <table className="w-full text-sm min-w-[400px]">
                            <thead>
                                <tr className="bg-slate-800/60">
                                    <th className="text-left py-3 px-3 sm:px-4 text-slate-400 font-medium sticky left-0 bg-slate-800/60 z-10 min-w-[70px]">Group</th>
                                    {ALL_SUBJECTS.map(s => (
                                        <th key={s.code} className="text-center py-3 px-2 sm:px-3 text-slate-400 font-medium whitespace-nowrap">{s.icon} {s.code}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {GROUPS.map(g => (
                                    <tr key={g} className="border-t border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                        <td className="py-3 px-3 sm:px-4 font-extrabold sticky left-0 bg-slate-900/80 z-10" style={{ color: GROUP_COLORS[g] }}>{g}</td>
                                        {ALL_SUBJECTS.map(s => {
                                            const p = overview?.matrix?.[s.code]?.[g]?.pct ?? null;
                                            return (
                                                <td key={s.code} className="py-3 px-2 sm:px-3 text-center">
                                                    {p !== null
                                                        ? <span className="font-bold" style={{ color: pctColor(p) }}>{p}%</span>
                                                        : <span className="text-slate-600">—</span>}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
        return dashIdx !== -1 ? c.classId.substring(0, dashIdx) === subCode : false;
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
            {mainTab === 'daily'    && <DailyTab />}
            {mainTab === 'compare'  && <CompareTab />}
            {mainTab === 'heatmap'  && <HeatmapTab />}
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

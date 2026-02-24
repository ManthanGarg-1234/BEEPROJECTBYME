import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    LineChart,
    Line
} from 'recharts';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';

const AttendanceReport = () => {
    const location = useLocation();
    const { user } = useAuth();
    const [classes, setClasses] = useState([]);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reportLoading, setReportLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchClasses = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await api.get('/analytics/student-dashboard');
                const classList = res.data?.classes || [];
                setClasses(classList);
                const params = new URLSearchParams(location.search);
                const classFromQuery = params.get('classId');
                const initialClassId = classFromQuery || classList[0]?.classId || '';
                setSelectedClassId(initialClassId);
            } catch (err) {
                setError('Failed to load your subjects. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        fetchClasses();
    }, [location.search]);

    useEffect(() => {
        if (!selectedClassId) return;
        const fetchReport = async () => {
            setReportLoading(true);
            setError('');
            try {
                const res = await api.get(`/attendance/student/${selectedClassId}`);
                setRecords(res.data || []);
            } catch (err) {
                setError('Failed to load attendance report.');
            } finally {
                setReportLoading(false);
            }
        };
        fetchReport();
    }, [selectedClassId]);

    const selectedClass = useMemo(
        () => classes.find((cls) => cls.classId === selectedClassId),
        [classes, selectedClassId]
    );

    const photoUrl = user?.profilePhoto
        ? `${import.meta.env.VITE_API_URL || ''}/uploads/profiles/${user.profilePhoto}`
        : '';

    const summary = useMemo(() => {
        return records.reduce(
            (acc, rec) => {
                if (rec.status === 'Present') acc.present += 1;
                else if (rec.status === 'Late') acc.late += 1;
                else acc.absent += 1;
                return acc;
            },
            { present: 0, late: 0, absent: 0 }
        );
    }, [records]);

    const pieData = useMemo(() => ([
        { name: 'Present', value: summary.present },
        { name: 'Late', value: summary.late },
        { name: 'Absent', value: summary.absent }
    ]), [summary]);

    const barData = useMemo(() => ([
        { label: 'Present', count: summary.present },
        { label: 'Late', count: summary.late },
        { label: 'Absent', count: summary.absent }
    ]), [summary]);

    const lineData = useMemo(() => {
        const sorted = [...records].sort((a, b) => {
            const aTime = new Date(a.session?.startTime || a.markedAt).getTime();
            const bTime = new Date(b.session?.startTime || b.markedAt).getTime();
            return aTime - bTime;
        });

        let total = 0;
        let present = 0;
        return sorted.map((rec) => {
            total += 1;
            if (rec.status === 'Present') present += 1;
            const percent = total ? Math.round((present / total) * 1000) / 10 : 0;
            const dateLabel = rec.session?.startTime
                ? new Date(rec.session.startTime).toLocaleDateString()
                : new Date(rec.markedAt).toLocaleDateString();
            return { date: dateLabel, percent };
        });
    }, [records]);

    if (loading) {
        return (
            <div className="page-container">
                <div className="space-y-6">
                    <div className="h-12 w-64 skeleton rounded-xl"></div>
                    {[1, 2].map((i) => (
                        <div key={i} className="h-56 skeleton rounded-2xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (!classes.length) {
        return (
            <div className="page-container">
                <div className="glass-card-solid p-8 text-center">
                    <h2 className="text-xl font-bold text-white mb-2">No Subjects Yet</h2>
                    <p className="text-slate-400">Ask your teacher to enroll you in a class.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
                <aside className="glass-card-solid p-5 h-fit lg:sticky lg:top-24">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-lg shadow-lg shadow-purple-500/30">
                            📚
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-[0.25em] text-purple-200/80">Reports</p>
                            <h2 className="text-lg font-bold text-white">My Subjects</h2>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {classes.map((cls) => (
                            <button
                                key={cls.classId}
                                type="button"
                                onClick={() => setSelectedClassId(cls.classId)}
                                className={`w-full text-left rounded-xl border px-3 py-2.5 transition-all duration-300 ${selectedClassId === cls.classId
                                    ? 'border-purple-300/70 bg-purple-500/10 text-white'
                                    : 'border-slate-700/60 bg-slate-900/60 text-slate-200 hover:border-purple-300/60'
                                    }`}
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
                </aside>

                <div>
                    <div className="mb-8 animate-fade-in">
                        <div className="flex items-center justify-between gap-4 mb-1">
                            <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                                <span className="text-white text-lg">📈</span>
                            </div>
                            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                                Attendance Report
                            </h1>
                            </div>
                            <div className="flex items-center gap-3 rounded-2xl border border-slate-200/20 bg-white/70 dark:bg-dark-800/70 px-3 py-2 shadow-lg shadow-purple-500/5">
                                <div className="w-11 h-11 rounded-xl overflow-hidden border border-purple-200/60 bg-slate-900/40">
                                    {photoUrl ? (
                                        <img src={photoUrl} alt={user?.name || 'Student'} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                                            {user?.name?.charAt(0)?.toUpperCase() || 'S'}
                                        </div>
                                    )}
                                </div>
                                <div className="hidden sm:block">
                                    <p className="text-xs uppercase tracking-[0.2em] text-purple-500/80">Student</p>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{user?.name || 'Student'}</p>
                                </div>
                            </div>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 ml-[52px]">
                            {selectedClass ? `${selectedClass.subject} • ${selectedClass.classId}` : 'Select a subject'}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-400/30 text-rose-200 text-sm font-medium flex items-center gap-2">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="stat-card text-center">
                            <p className="text-3xl font-bold text-emerald-500">{summary.present}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Present</p>
                        </div>
                        <div className="stat-card text-center">
                            <p className="text-3xl font-bold text-amber-500">{summary.late}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Late</p>
                        </div>
                        <div className="stat-card text-center">
                            <p className="text-3xl font-bold text-rose-500">{summary.absent}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Absent</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                        <div className="glass-card-solid p-5">
                            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">Status Split</h3>
                            <div className="h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80} innerRadius={50}>
                                            {pieData.map((entry) => (
                                                <Cell
                                                    key={entry.name}
                                                    fill={entry.name === 'Present' ? '#10b981' : entry.name === 'Late' ? '#f59e0b' : '#ef4444'}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="glass-card-solid p-5">
                            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">Sessions By Status</h3>
                            <div className="h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={barData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                                        <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                        <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
                                        <Tooltip />
                                        <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="glass-card-solid p-5">
                            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">Attendance Trend</h3>
                            <div className="h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={lineData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                                        <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                        <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} domain={[0, 100]} />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="percent" stroke="#22d3ee" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card-solid p-6">
                        <h3 className="font-semibold dark:text-white mb-4">Session History</h3>
                        {reportLoading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-10 skeleton rounded-lg"></div>
                                ))}
                            </div>
                        ) : records.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                No attendance records yet.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-dark-600">
                                            <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Date</th>
                                            <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Status</th>
                                            <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {records.map((rec) => (
                                            <tr key={rec._id} className="border-b border-gray-100 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors">
                                                <td className="py-3 px-4 dark:text-gray-200">
                                                    {rec.session?.startTime
                                                        ? new Date(rec.session.startTime).toLocaleDateString()
                                                        : '-'}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${rec.status === 'Present'
                                                        ? 'bg-emerald-500/10 text-emerald-500'
                                                        : rec.status === 'Late'
                                                            ? 'bg-amber-500/10 text-amber-500'
                                                            : 'bg-rose-500/10 text-rose-500'
                                                        }`}>{rec.status}</span>
                                                </td>
                                                <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">
                                                    {rec.markedAt ? new Date(rec.markedAt).toLocaleTimeString() : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttendanceReport;

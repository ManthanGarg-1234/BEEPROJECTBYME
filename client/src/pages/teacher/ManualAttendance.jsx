import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../api';

const ManualAttendance = () => {
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [sessions, setSessions] = useState([]);
    const [selectedSession, setSelectedSession] = useState('');
    const [data, setData] = useState(null);
    const [updating, setUpdating] = useState({});
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [chartData, setChartData] = useState([]);
    const navigate = useNavigate();

    useEffect(() => { fetchClasses(); }, []);

    useEffect(() => {
        if (selectedClass) {
            fetchSessions(selectedClass);
            fetchChartData(selectedClass);
        }
    }, [selectedClass]);

    useEffect(() => {
        if (selectedSession) fetchStudents(selectedSession);
    }, [selectedSession]);

    const fetchClasses = async () => {
        try {
            const res = await api.get('/classes');
            setClasses(res.data);
            if (res.data.length > 0) setSelectedClass(res.data[0].classId);
        } catch (err) { console.error(err); }
    };

    const fetchSessions = async (classId) => {
        try {
            const res = await api.get(`/sessions/history/${classId}`);
            setSessions(res.data);
            if (res.data.length > 0) setSelectedSession(res.data[0]._id);
            else { setSelectedSession(''); setData(null); }
        } catch (err) { console.error(err); }
    };

    const fetchStudents = async (sessionId) => {
        try {
            const res = await api.get(`/attendance/manual/${sessionId}`);
            setData(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchChartData = async (classId) => {
        try {
            const res = await api.get(`/analytics/daily-chart/${classId}`);
            setChartData(res.data);
        } catch (err) { console.error(err); }
    };

    const markStatus = async (studentId, status) => {
        setUpdating(prev => ({ ...prev, [studentId]: true }));
        try {
            await api.post('/attendance/manual', {
                sessionId: selectedSession,
                studentId,
                status
            });
            await fetchStudents(selectedSession);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update');
        } finally {
            setUpdating(prev => ({ ...prev, [studentId]: false }));
        }
    };

    const markAllPresent = async () => {
        if (!data || !confirm('Mark ALL students as Present?')) return;
        const absent = data.students.filter(s => s.status === 'Absent');
        for (const s of absent) {
            await markStatus(s._id, 'Present');
        }
    };

    const filteredStudents = data?.students?.filter(s => {
        const matchFilter = filter === 'all' || s.status.toLowerCase() === filter;
        const matchSearch = !search ||
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.rollNumber.toLowerCase().includes(search.toLowerCase());
        return matchFilter && matchSearch;
    }) || [];

    const counts = data?.students?.reduce((acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
    }, {}) || {};

    return (
        <div className="page-container animate-fade-in">
            <h1 className="section-title text-3xl mb-2">Manual Attendance</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
                Manually mark or override student attendance
            </p>

            {/* Selectors */}
            <div className="glass-card-solid p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Class</label>
                        <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="input-field">
                            {classes.map(c => <option key={c._id} value={c.classId}>{c.classId} - {c.subject}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Session</label>
                        <select value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)} className="input-field">
                            {sessions.map(s => (
                                <option key={s._id} value={s._id}>
                                    {new Date(s.startTime).toLocaleDateString()} {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {s.isActive ? ' (Active)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Daily Attendance % Chart */}
            {chartData.length > 0 && (
                <div className="glass-card-solid p-6 mb-8">
                    <h3 className="font-semibold dark:text-white mb-4">📈 Daily Attendance Percentage</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorPct" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#667eea" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                            <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} />
                            <YAxis stroke="#9ca3af" fontSize={12} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#fff' }}
                                formatter={(value) => [`${value}%`, 'Attendance']}
                            />
                            <Area type="monotone" dataKey="percentage" stroke="#667eea" strokeWidth={2} fill="url(#colorPct)" name="Attendance %" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            {sessions.length === 0 && (
                <div className="glass-card-solid p-12 text-center">
                    <span className="text-5xl block mb-3">📅</span>
                    <p className="text-gray-500 dark:text-gray-400">No sessions found for this class.</p>
                </div>
            )}

            {data && data.students.length > 0 && (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="stat-card text-center cursor-pointer" onClick={() => setFilter(filter === 'present' ? 'all' : 'present')}>
                            <p className={`text-2xl font-bold ${filter === 'present' ? 'text-green-400' : 'text-green-500'}`}>{counts.Present || 0}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Present</p>
                        </div>
                        <div className="stat-card text-center cursor-pointer" onClick={() => setFilter(filter === 'late' ? 'all' : 'late')}>
                            <p className={`text-2xl font-bold ${filter === 'late' ? 'text-yellow-400' : 'text-yellow-500'}`}>{counts.Late || 0}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Late</p>
                        </div>
                        <div className="stat-card text-center cursor-pointer" onClick={() => setFilter(filter === 'absent' ? 'all' : 'absent')}>
                            <p className={`text-2xl font-bold ${filter === 'absent' ? 'text-red-400' : 'text-red-500'}`}>{counts.Absent || 0}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Absent</p>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row gap-3 mb-6">
                        <input value={search} onChange={(e) => setSearch(e.target.value)}
                            className="input-field flex-1" placeholder="🔍 Search by name or roll number..." />
                        <button onClick={markAllPresent} className="btn-primary whitespace-nowrap">
                            ✅ Mark All Present
                        </button>
                    </div>

                    {/* Student List */}
                    <div className="glass-card-solid p-6">
                        <div className="space-y-3">
                            {filteredStudents.map(s => (
                                <div key={s._id} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border transition-all ${s.status === 'Present' ? 'border-green-500/20 bg-green-500/5' :
                                    s.status === 'Late' ? 'border-yellow-500/20 bg-yellow-500/5' :
                                        'border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700/50'
                                    }`}>
                                    <div className="mb-3 sm:mb-0">
                                        <p className="dark:text-white font-medium">{s.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {s.rollNumber}
                                            {s.isManual && <span className="ml-2 text-primary-400">• Manual</span>}
                                            {s.markedAt && <span className="ml-2">• {new Date(s.markedAt).toLocaleTimeString()}</span>}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        {['Present', 'Late', 'Absent'].map(status => (
                                            <button
                                                key={status}
                                                disabled={updating[s._id]}
                                                onClick={() => markStatus(s._id, status)}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${s.status === status
                                                    ? status === 'Present' ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                                                        : status === 'Late' ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/30'
                                                            : 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                                                    : 'bg-gray-100 dark:bg-dark-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-500'
                                                    }`}
                                            >
                                                {updating[s._id] ? '...' : status}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {filteredStudents.length === 0 && (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                No students match your filter.
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default ManualAttendance;

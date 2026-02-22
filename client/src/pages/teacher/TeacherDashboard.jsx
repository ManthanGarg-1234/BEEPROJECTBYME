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

    useEffect(() => {
        fetchClasses();
    }, []);

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
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchDashboard = async (classId) => {
        try {
            const res = await api.get(`/analytics/dashboard/${classId}`);
            setStats(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchChart = async (classId) => {
        try {
            const res = await api.get(`/analytics/daily-chart/${classId}`);
            setChartData(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) {
        return (
            <div className="page-container">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => <div key={i} className="stat-card h-32 skeleton"></div>)}
                </div>
            </div>
        );
    }

    if (classes.length === 0) {
        return (
            <div className="page-container">
                <div className="glass-card-solid p-12 text-center">
                    <span className="text-6xl mb-4 block">📚</span>
                    <h2 className="text-2xl font-bold mb-2 dark:text-white">No Classes Yet</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">Create your first class to get started</p>
                    <button onClick={() => navigate('/teacher/classes')} className="btn-primary">
                        Create Class
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="section-title text-3xl">Teacher Dashboard</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Overview of your class performance</p>
                </div>
                <select
                    id="class-selector"
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="input-field w-auto min-w-[200px]"
                >
                    {classes.map(c => (
                        <option key={c._id} value={c.classId}>{c.classId} - {c.subject}</option>
                    ))}
                </select>
            </div>

            {stats && (
                <>
                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="stat-card">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Sessions</p>
                                    <p className="text-3xl font-bold mt-1 dark:text-white">{stats.totalSessions}</p>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center">
                                    <span className="text-2xl">📅</span>
                                </div>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Avg Attendance</p>
                                    <p className="text-3xl font-bold mt-1 dark:text-white">{stats.avgAttendance}%</p>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                                    <span className="text-2xl">📊</span>
                                </div>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Students</p>
                                    <p className="text-3xl font-bold mt-1 dark:text-white">{stats.totalStudents}</p>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-accent-500/10 flex items-center justify-center">
                                    <span className="text-2xl">👥</span>
                                </div>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Below 75%</p>
                                    <p className="text-3xl font-bold mt-1 text-red-500">{stats.belowThresholdCount}</p>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                                    <span className="text-2xl">⚠️</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Semester Progress */}
                    <div className="glass-card-solid p-6 mb-8">
                        <h3 className="font-semibold dark:text-white mb-3">Semester Progress</h3>
                        <div className="relative h-3 bg-gray-200 dark:bg-dark-600 rounded-full overflow-hidden">
                            <div
                                className="absolute h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-1000"
                                style={{ width: `${Math.min(stats.semesterProgress, 100)}%` }}
                            ></div>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{stats.semesterProgress}% complete</p>
                    </div>

                    {/* Daily Chart */}
                    {chartData.length > 0 && (
                        <div className="glass-card-solid p-6 mb-8">
                            <h3 className="font-semibold dark:text-white mb-4">Daily Attendance Trend</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorPercent" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#667eea" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                                    <YAxis stroke="#9ca3af" fontSize={12} domain={[0, 100]} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#fff' }}
                                    />
                                    <Area type="monotone" dataKey="percentage" stroke="#667eea" strokeWidth={2} fill="url(#colorPercent)" name="Attendance %" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Student Stats Table */}
                    <div className="glass-card-solid p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold dark:text-white">Student-wise Summary</h3>
                            <button
                                onClick={() => navigate('/teacher/reports')}
                                className="btn-secondary text-sm px-4 py-2"
                            >
                                Full Report →
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-dark-600">
                                        <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Roll No</th>
                                        <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Name</th>
                                        <th className="text-center py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Present</th>
                                        <th className="text-center py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Total</th>
                                        <th className="text-center py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">%</th>
                                        <th className="text-center py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.studentStats?.map((s) => (
                                        <tr key={s._id} className="border-b border-gray-100 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors">
                                            <td className="py-3 px-4 font-mono text-xs dark:text-gray-300">{s.rollNumber}</td>
                                            <td className="py-3 px-4 dark:text-white">{s.name}</td>
                                            <td className="py-3 px-4 text-center dark:text-gray-300">{s.presentCount}</td>
                                            <td className="py-3 px-4 text-center dark:text-gray-300">{s.totalSessions}</td>
                                            <td className="py-3 px-4 text-center font-semibold">
                                                <span className={s.percentage >= 75 ? 'text-green-500' : s.percentage >= 65 ? 'text-yellow-500' : 'text-red-500'}>
                                                    {s.percentage}%
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {s.warningLevel ? (
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.warningLevel === 'Critical' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'
                                                        }`}>
                                                        {s.warningLevel}
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500">Good</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default TeacherDashboard;

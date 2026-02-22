import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../api';

const AttendanceReport = () => {
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [heatmapData, setHeatmapData] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchClasses(); }, []);

    useEffect(() => {
        if (selectedClass) {
            fetchHeatmap(selectedClass);
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

    const fetchHeatmap = async (classId) => {
        try { const res = await api.get(`/analytics/heatmap/${classId}`); setHeatmapData(res.data); }
        catch (err) { console.error(err); }
    };

    const fetchChart = async (classId) => {
        try { const res = await api.get(`/analytics/daily-chart/${classId}`); setChartData(res.data); }
        catch (err) { console.error(err); }
    };

    const exportCSV = async () => {
        try {
            const response = await api.get(`/analytics/csv/${selectedClass}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(response.data);
            const a = document.createElement('a');
            a.href = url; a.download = `attendance_${selectedClass}.csv`; a.click();
            window.URL.revokeObjectURL(url);
        } catch { alert('CSV export failed'); }
    };

    const getStatusColor = (status) => {
        if (status === 'Present') return 'bg-green-500';
        if (status === 'Late') return 'bg-yellow-500';
        if (status === 'Absent') return 'bg-red-500/30';
        return 'bg-gray-300 dark:bg-dark-600';
    };

    return (
        <div className="page-container animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="section-title text-3xl">Reports</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Analytics and exports</p>
                </div>
                <div className="flex gap-3">
                    <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="input-field w-auto">
                        {classes.map(c => <option key={c._id} value={c.classId}>{c.classId} - {c.subject}</option>)}
                    </select>
                    <button onClick={exportCSV} className="btn-secondary">📥 CSV</button>
                </div>
            </div>

            {chartData.length > 0 && (
                <div className="glass-card-solid p-6 mb-8">
                    <h3 className="font-semibold dark:text-white mb-4">Daily Breakdown</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                            <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} angle={-45} textAnchor="end" height={60} />
                            <YAxis stroke="#9ca3af" fontSize={12} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#fff' }} />
                            <Bar dataKey="present" fill="#10b981" name="Present" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="late" fill="#f59e0b" name="Late" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="absent" fill="#ef4444" name="Absent" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {heatmapData?.students?.length > 0 && (
                <div className="glass-card-solid p-6">
                    <h3 className="font-semibold dark:text-white mb-4">Heatmap</h3>
                    <div className="overflow-x-auto">
                        <table className="text-xs">
                            <thead>
                                <tr>
                                    <th className="py-2 px-3 text-left text-gray-500 dark:text-gray-400 font-medium sticky left-0 bg-white dark:bg-dark-800 z-10 min-w-[140px]">Student</th>
                                    {heatmapData.dates?.map((d, i) => (
                                        <th key={i} className="py-2 px-1 text-center text-gray-500 dark:text-gray-400 font-medium" style={{ writingMode: 'vertical-lr', minWidth: '28px' }}>{d.substring(5)}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {heatmapData.students.map((s, i) => (
                                    <tr key={i} className="border-t border-gray-100 dark:border-dark-700">
                                        <td className="py-2 px-3 dark:text-gray-300 sticky left-0 bg-white dark:bg-dark-800 z-10">
                                            <span className="font-medium">{s.name}</span><br />
                                            <span className="text-gray-400 font-mono">{s.rollNumber}</span>
                                        </td>
                                        {s.sessions.map((sess, j) => (
                                            <td key={j} className="py-2 px-1 text-center" title={`${sess.date}: ${sess.status}`}>
                                                <div className={`w-5 h-5 rounded-sm mx-auto ${getStatusColor(sess.status)}`}></div>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center gap-6 mt-4 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-sm bg-green-500"></div><span>Present</span></div>
                        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-sm bg-yellow-500"></div><span>Late</span></div>
                        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-sm bg-red-500/30"></div><span>Absent</span></div>
                    </div>
                </div>
            )}

            {!chartData.length && !loading && (
                <div className="glass-card-solid p-12 text-center">
                    <span className="text-5xl block mb-3">📊</span>
                    <p className="text-gray-500 dark:text-gray-400">No data yet. Start a session first.</p>
                </div>
            )}
        </div>
    );
};

export default AttendanceReport;

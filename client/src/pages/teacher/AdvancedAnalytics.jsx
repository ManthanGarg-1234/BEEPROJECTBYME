import React, { useState, useEffect } from 'react';
import api from '../../api';
import { useTheme } from '../../context/ThemeContext';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { TrendingUp, Users, AlertCircle, Loader, CheckCircle, Target } from 'lucide-react';

const AdvancedAnalytics = () => {
  const { darkMode } = useTheme();
  const [classId, setClassId] = useState('');
  const [classes, setClasses] = useState([]);
  const [classesError, setClassesError] = useState('');
  const [timeRange, setTimeRange] = useState('week');
  const [loading, setLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState([]);
  const [marksData, setMarksData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [stats, setStats] = useState({});

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (classId) {
      fetchAnalytics();
    }
  }, [classId, timeRange]);

  const fetchClasses = async () => {
    try {
      setClassesError('');
      const response = await api.get('/classes/my-classes');
      const data = response.data.data || [];
      setClasses(data);
      if (data.length === 0) setClassesError('No groups found. Please ensure the database is seeded.');
    } catch (error) {
      console.error('Error fetching classes:', error);
      setClassesError('Failed to load groups. Please check your connection.');
    }
  };

  // Format: "G18-BE" → "Group G18 · Backend Engineering"
  const formatClassLabel = (c) => {
    const group = c.classId?.split('-')?.[0] || '';
    return `Group ${group} · ${c.subject}`;
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch class insights
      const insightsRes = await api.get(`/analytics/advanced/class/${classId}`);
      const insights = insightsRes.data || {};

      // Fetch daily trends
      const dailyRes = await api.get(`/analytics/daily-chart/${classId}`);
      const dailyData = dailyRes.data || [];

      // Process attendance trends
      if (dailyData.length > 0) {
        const days = getDaysInRange();
        const filteredDaily = dailyData.slice(-days);
        
        const trendData = filteredDaily.map(d => ({
          date: d.date,
          attendance: d.percentage
        }));
        setTrendData(trendData);
        
        // Aggregate for pie chart
        let present = 0, absent = 0, late = 0;
        filteredDaily.forEach(d => {
           present += d.present || 0;
           absent += d.absent || 0;
           late += d.late || 0;
        });
        
        setAttendanceData([
          { name: 'Present', value: present, color: '#10b981' },
          { name: 'Absent', value: absent, color: '#ef4444' },
          { name: 'Late', value: late, color: '#f59e0b' },
        ]);
      } else {
        setTrendData([]);
        setAttendanceData([]);
      }

      // Calculate statistics from insights
      const riskDist = insights.riskDistribution || {};
      const lowAttendance = (riskDist.critical || 0) + (riskDist.high || 0);
      const highAttendance = (riskDist.medium || 0) + (riskDist.low || 0);

      setStats({
        totalStudents: insights.totalStudents || 0,
        avgAttendance: insights.avgAttendance?.toFixed(1) || '0.0',
        lowAttendance,
        highAttendance,
        healthScore: insights.healthScore || 0,
        minAttendance: insights.minAttendance || 0,
        maxAttendance: insights.maxAttendance || 0,
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
      setTrendData([]);
      setAttendanceData([]);
      setStats({});
    } finally {
      setLoading(false);
    }
  };

  const getDynamicRecommendations = () => {
    const recs = [];
    if (!stats.totalStudents) {
      return ['No data available to generate recommendations.'];
    }

    const avg = parseFloat(stats.avgAttendance);
    if (avg < 75) {
      recs.push(`Alert: Class average is low (${avg}%). Consider scheduling a review session or sending bulk warnings.`);
    } else if (avg > 90) {
      recs.push(`Excellent: Class average is exceptional (${avg}%). Keep up the good work!`);
    } else {
      recs.push(`Good: Class average is healthy (${avg}%).`);
    }

    if (stats.lowAttendance > 0) {
      recs.push(`Action Required: ${stats.lowAttendance} student(s) are at high risk (below 75%). Use the dashboard to intervene.`);
    }

    if (stats.minAttendance < 50) {
      recs.push(`Warning: Lowest attendance in class is ${stats.minAttendance}%. Individual counseling recommended.`);
    }

    if (recs.length < 4) {
      recs.push('Review feedback regularly to identify and improve weak areas in your teaching.');
    }

    return recs;
  };

  const getDaysInRange = () => {
    switch (timeRange) {
      case 'week':
        return 7;
      case 'month':
        return 30;
      case 'semester':
        return 120;
      default:
        return 7;
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50'} p-4 md:p-8 transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-4xl md:text-5xl font-bold mb-2 flex items-center gap-3 ${darkMode ? 'bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent' : 'bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent'}`}>
            <TrendingUp className={`w-8 h-8 md:w-10 md:h-10 ${darkMode ? 'text-cyan-400' : 'text-indigo-600'}`} /> Advanced Analytics
          </h1>
          <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Deep insights into attendance and performance</p>
        </div>

        {/* Controls */}
        <div className={`rounded-xl shadow-lg p-6 md:p-8 mb-8 border-t-4 ${darkMode ? 'bg-slate-800 border-cyan-500' : 'bg-white border-blue-500'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={`block text-sm font-semibold mb-3 uppercase tracking-wide ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Select Group / Class</label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 outline-none transition ${darkMode ? 'bg-slate-700 border-slate-600 text-gray-100 focus:border-cyan-500 focus:ring-cyan-500/20' : 'bg-white border-gray-300 text-gray-800 focus:border-indigo-500 focus:ring-indigo-200'}`}
              >
                <option value="">Choose a group / class</option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {formatClassLabel(c)}
                  </option>
                ))}
              </select>
              {classesError && (
                <div className={`mt-2 flex items-center gap-2 text-sm ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{classesError}</span>
                </div>
              )}
              {classes.length > 0 && (
                <p className={`mt-1 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{classes.length} group{classes.length !== 1 ? 's' : ''} available</p>
              )}
            </div>
            <div>
              <label className={`block text-sm font-semibold mb-3 uppercase tracking-wide ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Time Range</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 outline-none transition ${darkMode ? 'bg-slate-700 border-slate-600 text-gray-100 focus:border-cyan-500 focus:ring-cyan-500/20' : 'bg-white border-gray-300 text-gray-800 focus:border-indigo-500 focus:ring-indigo-200'}`}
              >
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="semester">Last 120 Days</option>
              </select>
            </div>
          </div>
        </div>

        {classId && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { label: 'Total Students', value: stats.totalStudents, Icon: Users, light: 'from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-600', dark: 'from-indigo-900/40 to-indigo-800/40 border-indigo-700 text-indigo-400' },
                { label: 'Avg Attendance', value: `${stats.avgAttendance}%`, Icon: CheckCircle, light: 'from-green-50 to-green-100 border-green-200 text-green-600', dark: 'from-green-900/40 to-green-800/40 border-green-700 text-green-400' },
                { label: 'Engaged', value: stats.highAttendance, Icon: Target, light: 'from-blue-50 to-blue-100 border-blue-200 text-blue-600', dark: 'from-blue-900/40 to-blue-800/40 border-blue-700 text-blue-400' },
                { label: 'At Risk', value: stats.lowAttendance, Icon: AlertCircle, light: 'from-red-50 to-red-100 border-red-200 text-red-600', dark: 'from-red-900/40 to-red-800/40 border-red-700 text-red-400' },
              ].map(({ label, value, Icon, light, dark }) => (
                <div key={label} className={`bg-gradient-to-br rounded-xl shadow-lg p-6 border ${darkMode ? dark : light}`}>
                  <div className="flex items-center justify-between mb-4">
                    <p className={`text-sm font-semibold uppercase ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{label}</p>
                    <Icon className="w-6 h-6" />
                  </div>
                  <p className="text-4xl font-bold">{value}</p>
                </div>
              ))}
            </div>

            {/* Charts */}
            {loading ? (
              <div className={`flex items-center justify-center py-16 rounded-xl shadow-lg ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                <Loader className={`w-10 h-10 animate-spin ${darkMode ? 'text-cyan-400' : 'text-indigo-600'}`} />
                <span className={`ml-4 text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading analytics...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Attendance Trend */}
                <div className={`rounded-xl shadow-lg p-6 md:p-8 border-l-4 ${darkMode ? 'bg-slate-800 border-cyan-500' : 'bg-white border-indigo-500'}`}>
                  <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                    <TrendingUp className={`w-6 h-6 ${darkMode ? 'text-cyan-400' : 'text-indigo-600'}`} /> Attendance Trend
                  </h2>
                  {trendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={trendData}>
                        <defs>
                          <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '2px solid #6366f1',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="attendance"
                          stroke="#6366f1"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorAttendance)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12">
                      <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>No data available for this period</p>
                    </div>
                  )}
                </div>

                {/* Attendance Distribution */}
                <div className={`rounded-xl shadow-lg p-6 md:p-8 border-l-4 ${darkMode ? 'bg-slate-800 border-cyan-500' : 'bg-white border-indigo-500'}`}>
                  <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>Attendance Distribution</h2>
                  {attendanceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={attendanceData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {attendanceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '2px solid #6366f1',
                            borderRadius: '8px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12">
                      <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>No data available</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Performance Insights */}
            <div className={`rounded-xl shadow-lg p-6 md:p-8 border-l-4 ${darkMode ? 'bg-slate-800 border-cyan-500' : 'bg-white border-indigo-500'}`}>
              <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>Performance Insights & Recommendations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className={`rounded-lg p-6 border ${darkMode ? 'bg-gradient-to-br from-indigo-900/40 to-indigo-800/40 border-indigo-700' : 'bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200'}`}>
                  <h3 className={`font-bold mb-4 text-lg flex items-center gap-2 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                    <Target className={`w-5 h-5 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                    Key Recommendations
                  </h3>
                  <ul className="space-y-3">
                    {getDynamicRecommendations().map((tip, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className={`font-bold text-xl mt-0.5 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>→</span>
                        <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3">
                  <h3 className={`font-bold mb-4 text-lg flex items-center gap-2 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Quick Statistics
                  </h3>
                  {[
                    { label: 'Attendance Rate', value: `${stats.avgAttendance}%`, cls: darkMode ? 'bg-indigo-900/30 border-indigo-700 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-600' },
                    { label: 'Students Engaged', value: `${stats.highAttendance}/${stats.totalStudents}`, cls: darkMode ? 'bg-green-900/30 border-green-700 text-green-400' : 'bg-green-50 border-green-200 text-green-600' },
                    { label: 'Need Intervention', value: stats.lowAttendance, cls: darkMode ? 'bg-red-900/30 border-red-700 text-red-400' : 'bg-red-50 border-red-200 text-red-600' },
                    { label: 'Time Range', value: `${getDaysInRange()} days`, cls: darkMode ? 'bg-orange-900/30 border-orange-700 text-orange-400' : 'bg-orange-50 border-orange-200 text-orange-600' },
                  ].map(({ label, value, cls }) => (
                    <div key={label} className={`flex items-center justify-between p-4 rounded-lg border hover:shadow-md transition ${cls}`}>
                      <span className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{label}</span>
                      <span className="font-bold text-lg">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdvancedAnalytics;

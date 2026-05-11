import React, { useState, useEffect } from 'react';
import api from '../../api';
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
import { TrendingUp, Calendar, Users, AlertCircle, Loader, CheckCircle, Target } from 'lucide-react';

const AdvancedAnalytics = () => {
  const [classId, setClassId] = useState('');
  const [classes, setClasses] = useState([]);
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
      const response = await api.get('/classes/my-classes');
      setClasses(response.data.data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/analytics/class-overview/${classId}`);

      const data = response.data.data || {};

      // Process attendance trends
      if (data.dailyTrends) {
        setTrendData(data.dailyTrends);
      }

      // Calculate statistics
      const totalStudents = data.totalStudents || 0;
      const avgAttendance = data.averageAttendance || 0;
      const lowAttendance = data.lowAttendanceStudents || 0;

      setStats({
        totalStudents,
        avgAttendance: avgAttendance.toFixed(1),
        lowAttendance,
        highAttendance: totalStudents - lowAttendance,
      });

      // Process attendance by student (pie chart)
      if (data.studentStats) {
        const pieData = [
          { name: 'Present', value: data.studentStats.present || 0, color: '#10b981' },
          { name: 'Absent', value: data.studentStats.absent || 0, color: '#ef4444' },
          { name: 'Late', value: data.studentStats.late || 0, color: '#f59e0b' },
        ];
        setAttendanceData(pieData);
      }

      // Process marks distribution
      if (data.marksDistribution) {
        setMarksData(data.marksDistribution);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 md:w-10 md:h-10 text-indigo-600" /> Advanced Analytics
          </h1>
          <p className="text-gray-600 text-lg">Deep insights into attendance and performance</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-8 border-t-4 border-blue-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Select Class</label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
              >
                <option value="">Choose a class</option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.classId} - {c.subject}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Time Range</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
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
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl shadow-lg p-6 border border-indigo-200">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-700 text-sm font-semibold uppercase">Total Students</p>
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
                <p className="text-4xl font-bold text-indigo-600">{stats.totalStudents}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-lg p-6 border border-green-200">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-700 text-sm font-semibold uppercase">Avg Attendance</p>
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-4xl font-bold text-green-600">{stats.avgAttendance}%</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg p-6 border border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-700 text-sm font-semibold uppercase">Engaged</p>
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-4xl font-bold text-blue-600">{stats.highAttendance}</p>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-lg p-6 border border-red-200">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-700 text-sm font-semibold uppercase">At Risk</p>
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <p className="text-4xl font-bold text-red-600">{stats.lowAttendance}</p>
              </div>
            </div>

            {/* Charts */}
            {loading ? (
              <div className="flex items-center justify-center py-16 bg-white rounded-xl shadow-lg">
                <Loader className="w-10 h-10 text-indigo-600 animate-spin" />
                <span className="ml-4 text-gray-600 text-lg">Loading analytics...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Attendance Trend */}
                <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 border-l-4 border-indigo-500">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-indigo-600" /> Attendance Trend
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
                      <p className="text-gray-600">No data available for this period</p>
                    </div>
                  )}
                </div>

                {/* Attendance Distribution */}
                <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 border-l-4 border-indigo-500">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Attendance Distribution</h2>
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
                      <p className="text-gray-600">No data available</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Performance Insights */}
            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 border-l-4 border-indigo-500">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Performance Insights & Recommendations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-6 border border-indigo-200">
                  <h3 className="font-bold text-gray-800 mb-4 text-lg flex items-center gap-2">
                    <Target className="w-5 h-5 text-indigo-600" />
                    Key Recommendations
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <span className="text-indigo-600 font-bold text-xl mt-0.5">→</span>
                      <span className="text-gray-700">Focus on low-attendance students to improve overall metrics and class performance</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-indigo-600 font-bold text-xl mt-0.5">→</span>
                      <span className="text-gray-700">Review and approve leave requests strategically for better retention</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-indigo-600 font-bold text-xl mt-0.5">→</span>
                      <span className="text-gray-700">Monitor suspicious activities to maintain system integrity and fairness</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-indigo-600 font-bold text-xl mt-0.5">→</span>
                      <span className="text-gray-700">Review feedback regularly to identify and improve weak areas in your teaching</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h3 className="font-bold text-gray-800 mb-4 text-lg flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Quick Statistics
                  </h3>
                  <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg border border-indigo-200 hover:shadow-md transition">
                    <span className="text-gray-700 font-semibold">Attendance Rate</span>
                    <span className="font-bold text-indigo-600 text-lg">{stats.avgAttendance}%</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200 hover:shadow-md transition">
                    <span className="text-gray-700 font-semibold">Students Engaged</span>
                    <span className="font-bold text-green-600 text-lg">{stats.highAttendance}/{stats.totalStudents}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200 hover:shadow-md transition">
                    <span className="text-gray-700 font-semibold">Need Intervention</span>
                    <span className="font-bold text-red-600 text-lg">{stats.lowAttendance}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200 hover:shadow-md transition">
                    <span className="text-gray-700 font-semibold">Time Range</span>
                    <span className="font-bold text-orange-600 text-lg">{getDaysInRange()} days</span>
                  </div>
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

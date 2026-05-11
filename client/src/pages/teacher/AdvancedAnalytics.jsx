import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
import { TrendingUp, Calendar, Users, AlertCircle } from 'lucide-react';

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
      const response = await axios.get('http://localhost:5000/api/classes', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setClasses(response.data.data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:5000/api/analytics/class-overview/${classId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp className="w-8 h-8" /> Advanced Analytics
          </h1>
          <p className="text-gray-600 mt-2">Deep insights into attendance and performance</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Choose a class</option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-gray-600 text-sm">Total Students</p>
                <p className="text-3xl font-bold text-indigo-600 mt-2">{stats.totalStudents}</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-gray-600 text-sm">Avg Attendance</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.avgAttendance}%</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-gray-600 text-sm">High Attendance</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{stats.highAttendance}</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
                <p className="text-gray-600 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" /> At Risk
                </p>
                <p className="text-3xl font-bold text-red-600 mt-2">{stats.lowAttendance}</p>
              </div>
            </div>

            {/* Charts */}
            {loading ? (
              <p className="text-gray-600 text-center py-12">Loading analytics...</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Attendance Trend */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Attendance Trend</h2>
                  {trendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={trendData}>
                        <defs>
                          <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Area type="monotone" dataKey="attendance" stroke="#6366f1" fillOpacity={1} fill="url(#colorAttendance)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-600">No data available</p>
                  )}
                </div>

                {/* Attendance Distribution */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Attendance Distribution</h2>
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
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-600">No data available</p>
                  )}
                </div>
              </div>
            )}

            {/* Performance Insights */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Performance Insights</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">Recommendations</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-600 font-bold mt-0.5">•</span>
                      <span>Focus on low-attendance students to improve overall metrics</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-600 font-bold mt-0.5">•</span>
                      <span>Consider leave approval strategies for better retention</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-600 font-bold mt-0.5">•</span>
                      <span>Monitor suspicious activities to maintain system integrity</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-600 font-bold mt-0.5">•</span>
                      <span>Review feedback regularly to improve class quality</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">Quick Stats</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                      <span className="text-gray-700">Attendance Effectiveness</span>
                      <span className="font-bold text-indigo-600">{stats.avgAttendance}%</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-gray-700">Students Engaged</span>
                      <span className="font-bold text-green-600">{stats.highAttendance}/{stats.totalStudents}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <span className="text-gray-700">Need Intervention</span>
                      <span className="font-bold text-red-600">{stats.lowAttendance}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <span className="text-gray-700">Time Range</span>
                      <span className="font-bold text-orange-600">{getDaysInRange()} days</span>
                    </div>
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

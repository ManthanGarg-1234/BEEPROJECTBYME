import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Star, TrendingUp } from 'lucide-react';

const FeedbackAnalytics = () => {
  const [classId, setClassId] = useState('');
  const [classes, setClasses] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (classId) {
      fetchFeedback();
      fetchAnalytics();
    }
  }, [classId]);

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

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:5000/api/feedback/class/${classId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setFeedback(response.data.data || []);
      if (response.data.stats) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/feedback/analytics/${classId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  const getRatingColor = (avg) => {
    if (avg >= 4) return 'text-green-600 bg-green-50';
    if (avg >= 3) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800">Feedback Analytics</h1>
          <p className="text-gray-600 mt-2">View and analyze class feedback</p>
        </div>

        {/* Class Selection */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
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

        {/* Statistics */}
        {classId && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className={`rounded-lg p-6 text-center ${getRatingColor(stats.avgRating)}`}>
                <p className="text-sm font-medium mb-2">Average Rating</p>
                <p className="text-3xl font-bold">{stats.avgRating || 0}</p>
                <p className="text-xs mt-1">/5.0</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-6 text-center">
                <p className="text-sm font-medium text-gray-600 mb-2">Total Feedback</p>
                <p className="text-3xl font-bold text-blue-600">{stats.total || 0}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-6 text-center">
                <p className="text-sm font-medium text-gray-600 mb-2">5-Star Rating</p>
                <p className="text-3xl font-bold text-purple-600">
                  {stats.ratingBreakdown?.['5'] || 0}
                </p>
              </div>
              <div className="bg-indigo-50 rounded-lg p-6 text-center">
                <p className="text-sm font-medium text-gray-600 mb-2">1-Star Rating</p>
                <p className="text-3xl font-bold text-indigo-600">
                  {stats.ratingBreakdown?.['1'] || 0}
                </p>
              </div>
            </div>

            {/* Rating Breakdown Chart */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" /> Rating Distribution
              </h2>
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((rating) => (
                  <div key={rating} className="flex items-center gap-4">
                    <span className="w-12 text-right font-semibold">{rating} ⭐</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-8 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full flex items-center justify-center text-white text-sm font-semibold transition-all"
                        style={{
                          width: `${stats.total ? (stats.ratingBreakdown?.[rating] || 0 / stats.total) * 100 : 0}%`,
                        }}
                      >
                        {stats.ratingBreakdown?.[rating] || 0}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feedback List */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">Recent Feedback</h2>
              {loading ? (
                <p className="text-gray-600">Loading...</p>
              ) : feedback.length === 0 ? (
                <p className="text-gray-600">No feedback yet</p>
              ) : (
                <div className="space-y-4">
                  {feedback.map((item) => (
                    <div
                      key={item._id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-gray-800">
                            {item.isAnonymous ? 'Anonymous' : item.studentId?.name || 'Unknown'}
                          </p>
                          <p className="text-sm text-gray-600 capitalize">{item.category}</p>
                        </div>
                        {renderStars(item.rating)}
                      </div>
                      {item.comment && (
                        <p className="text-gray-700 mt-3 p-3 bg-gray-50 rounded">
                          {item.comment}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-gray-500">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                        <div className="flex gap-2">
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                            👍 {item.helpful || 0}
                          </span>
                          <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">
                            👎 {item.unhelpful || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FeedbackAnalytics;

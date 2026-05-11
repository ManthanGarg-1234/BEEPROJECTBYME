import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Star, TrendingUp, MessageSquare, ThumbsUp, ThumbsDown, Loader } from 'lucide-react';

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
    }
  }, [classId]);

  const fetchClasses = async () => {
    try {
      const response = await api.get('/classes/my-classes');
      setClasses(response.data.data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/feedback/class/${classId}`);
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
    if (avg >= 4) return 'from-green-50 to-green-100 border-green-200 text-green-700';
    if (avg >= 3) return 'from-yellow-50 to-yellow-100 border-yellow-200 text-yellow-700';
    return 'from-red-50 to-red-100 border-red-200 text-red-700';
  };

  const avgRating = stats.avgRating || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Feedback Analytics
          </h1>
          <p className="text-gray-600 text-lg">Analyze class feedback and ratings</p>
        </div>

        {/* Class Selection */}
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-8 border-t-4 border-blue-500">
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

        {/* Statistics */}
        {classId && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className={`bg-gradient-to-br ${getRatingColor(avgRating)} rounded-xl shadow-lg p-6 border text-center`}>
                <p className="text-sm font-semibold uppercase mb-3">Average Rating</p>
                <p className="text-5xl font-bold">{avgRating.toFixed(1)}</p>
                <p className="text-xs mt-2">out of 5.0</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg p-6 border border-blue-200 text-center">
                <div className="flex items-center justify-center mb-3">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-sm font-semibold text-gray-700 uppercase mb-2">Total Feedback</p>
                <p className="text-4xl font-bold text-blue-600">{stats.total || 0}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-lg p-6 border border-purple-200 text-center">
                <div className="flex items-center justify-center mb-3">
                  <Star className="w-6 h-6 text-purple-600 fill-purple-600" />
                </div>
                <p className="text-sm font-semibold text-gray-700 uppercase mb-2">5-Star</p>
                <p className="text-4xl font-bold text-purple-600">{stats.ratingBreakdown?.['5'] || 0}</p>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-lg p-6 border border-red-200 text-center">
                <div className="flex items-center justify-center mb-3">
                  <Star className="w-6 h-6 text-red-600" />
                </div>
                <p className="text-sm font-semibold text-gray-700 uppercase mb-2">1-Star</p>
                <p className="text-4xl font-bold text-red-600">{stats.ratingBreakdown?.['1'] || 0}</p>
              </div>
            </div>

            {/* Rating Breakdown Chart */}
            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-8 border-l-4 border-indigo-500">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-indigo-600" /> Rating Distribution
              </h2>
              <div className="space-y-4">
                {[5, 4, 3, 2, 1].map((rating) => (
                  <div key={rating} className="flex items-center gap-4">
                    <span className="w-16 text-right font-bold text-gray-700">{rating} ⭐</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-10 overflow-hidden shadow">
                      <div
                        className="bg-gradient-to-r from-indigo-600 to-indigo-400 h-full flex items-center justify-center text-white font-bold transition-all duration-300"
                        style={{
                          width: `${stats.total ? ((stats.ratingBreakdown?.[rating] || 0) / stats.total) * 100 : 0}%`,
                          minWidth: stats.ratingBreakdown?.[rating] ? '60px' : '0'
                        }}
                      >
                        {stats.ratingBreakdown?.[rating] || 0}
                      </div>
                    </div>
                    <span className="w-12 text-right text-sm text-gray-600 font-semibold">
                      {stats.total ? (((stats.ratingBreakdown?.[rating] || 0) / stats.total) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Feedback List */}
            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 border-l-4 border-indigo-500">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-indigo-600" />
                Recent Feedback ({feedback.length})
              </h2>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="w-8 h-8 text-indigo-600 animate-spin" />
                  <span className="ml-3 text-gray-600">Loading feedback...</span>
                </div>
              ) : feedback.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">No feedback yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {feedback.map((item) => (
                    <div
                      key={item._id}
                      className="border-2 border-gray-200 rounded-lg p-5 hover:shadow-lg hover:border-indigo-300 transition bg-gradient-to-r from-gray-50 to-transparent"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-bold text-gray-800">
                            {item.isAnonymous ? '👤 Anonymous' : item.student?.name || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 uppercase font-semibold">
                            {item.category}
                          </p>
                        </div>
                        <div>{renderStars(item.rating)}</div>
                      </div>
                      
                      {item.title && (
                        <p className="font-semibold text-gray-800 mb-2">{item.title}</p>
                      )}
                      
                      {item.comment && (
                        <p className="text-gray-700 mb-3 p-3 bg-white rounded border border-gray-200">
                          {item.comment}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {new Date(item.createdAt).toLocaleDateString('en-IN')}
                        </span>
                        <div className="flex gap-3">
                          <span className="inline-flex items-center gap-1 text-xs px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-200 font-semibold">
                            <ThumbsUp className="w-3 h-3" /> {item.helpful || 0}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs px-3 py-1 bg-red-50 text-red-700 rounded-full border border-red-200 font-semibold">
                            <ThumbsDown className="w-3 h-3" /> {item.unhelpful || 0}
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

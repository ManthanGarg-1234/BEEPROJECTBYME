import React, { useState, useEffect } from 'react';
import api from '../../api';
import { useTheme } from '../../context/ThemeContext';
import { Star, TrendingUp, MessageSquare, ThumbsUp, ThumbsDown, Loader, AlertCircle } from 'lucide-react';

const FeedbackAnalytics = () => {
  const { darkMode } = useTheme();
  const [classId, setClassId] = useState('');
  const [classes, setClasses] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [classesError, setClassesError] = useState('');

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
      setClassesError('');
      const response = await api.get('/classes/my-classes');
      const data = response.data.data || [];
      setClasses(data);
      if (data.length === 0) {
        setClassesError('No groups found for your account. Please ensure the database is seeded.');
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      setClassesError('Failed to load groups. Please check your connection.');
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

  const renderStars = (rating) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i <= rating ? 'fill-yellow-400 text-yellow-400' : darkMode ? 'text-gray-600' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );

  const getRatingColor = (avg) => {
    if (darkMode) {
      if (avg >= 4) return 'from-green-900/50 to-green-800/50 border-green-700 text-green-300';
      if (avg >= 3) return 'from-yellow-900/50 to-yellow-800/50 border-yellow-700 text-yellow-300';
      return 'from-red-900/50 to-red-800/50 border-red-700 text-red-300';
    }
    if (avg >= 4) return 'from-green-50 to-green-100 border-green-200 text-green-700';
    if (avg >= 3) return 'from-yellow-50 to-yellow-100 border-yellow-200 text-yellow-700';
    return 'from-red-50 to-red-100 border-red-200 text-red-700';
  };

  const avgRating = stats.avgRating || 0;

  // Format class label: "G18-BE - Backend Engineering" → "Group G18 · Backend Engineering"
  const formatClassLabel = (c) => {
    const parts = c.classId?.split('-');
    const group = parts?.[0] || '';
    return `Group ${group} · ${c.subject}`;
  };

  return (
    <div className={`min-h-screen ${darkMode
      ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
      : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50'} p-4 md:p-8 transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-4xl md:text-5xl font-bold mb-2 ${darkMode
            ? 'bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent'}`}>
            Feedback Analytics
          </h1>
          <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            View and analyze class feedback
          </p>
        </div>

        {/* Class Selection */}
        <div className={`rounded-xl shadow-lg p-6 md:p-8 mb-8 border-t-4 ${darkMode
          ? 'bg-slate-800 border-purple-500'
          : 'bg-white border-blue-500'}`}>
          <label className={`block text-sm font-semibold mb-3 uppercase tracking-wide ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Select Group / Class
          </label>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 outline-none transition ${darkMode
              ? 'bg-slate-700 border-slate-600 text-gray-100 focus:border-purple-500 focus:ring-purple-500/20'
              : 'bg-white border-gray-300 text-gray-800 focus:border-indigo-500 focus:ring-indigo-200'}`}
          >
            <option value="">Choose a group / class</option>
            {classes.map((c) => (
              <option key={c._id} value={c._id}>
                {formatClassLabel(c)}
              </option>
            ))}
          </select>

          {classesError && (
            <div className={`mt-3 flex items-center gap-2 text-sm ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{classesError}</span>
            </div>
          )}

          {classes.length > 0 && (
            <p className={`mt-2 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {classes.length} group{classes.length !== 1 ? 's' : ''} available
            </p>
          )}
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
              <div className={`rounded-xl shadow-lg p-6 border text-center ${darkMode
                ? 'bg-gradient-to-br from-blue-900/50 to-blue-800/50 border-blue-700'
                : 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'}`}>
                <div className="flex items-center justify-center mb-3">
                  <MessageSquare className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <p className={`text-sm font-semibold uppercase mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Total Feedback</p>
                <p className={`text-4xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{stats.total || 0}</p>
              </div>
              <div className={`rounded-xl shadow-lg p-6 border text-center ${darkMode
                ? 'bg-gradient-to-br from-purple-900/50 to-purple-800/50 border-purple-700'
                : 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200'}`}>
                <div className="flex items-center justify-center mb-3">
                  <Star className={`w-6 h-6 ${darkMode ? 'text-purple-400 fill-purple-400' : 'text-purple-600 fill-purple-600'}`} />
                </div>
                <p className={`text-sm font-semibold uppercase mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>5-Star</p>
                <p className={`text-4xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>{stats.ratingBreakdown?.['5'] || 0}</p>
              </div>
              <div className={`rounded-xl shadow-lg p-6 border text-center ${darkMode
                ? 'bg-gradient-to-br from-red-900/50 to-red-800/50 border-red-700'
                : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'}`}>
                <div className="flex items-center justify-center mb-3">
                  <Star className={`w-6 h-6 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
                </div>
                <p className={`text-sm font-semibold uppercase mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>1-Star</p>
                <p className={`text-4xl font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>{stats.ratingBreakdown?.['1'] || 0}</p>
              </div>
            </div>

            {/* Rating Breakdown Chart */}
            <div className={`rounded-xl shadow-lg p-6 md:p-8 mb-8 border-l-4 ${darkMode
              ? 'bg-slate-800 border-purple-500'
              : 'bg-white border-indigo-500'}`}>
              <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                <TrendingUp className={`w-6 h-6 ${darkMode ? 'text-purple-400' : 'text-indigo-600'}`} />
                Rating Distribution
              </h2>
              <div className="space-y-4">
                {[5, 4, 3, 2, 1].map((rating) => (
                  <div key={rating} className="flex items-center gap-4">
                    <span className={`w-16 text-right font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{rating} ⭐</span>
                    <div className={`flex-1 rounded-full h-10 overflow-hidden shadow ${darkMode ? 'bg-slate-700' : 'bg-gray-200'}`}>
                      <div
                        className={`h-full flex items-center justify-center text-white font-bold transition-all duration-300 ${darkMode
                          ? 'bg-gradient-to-r from-purple-600 to-purple-400'
                          : 'bg-gradient-to-r from-indigo-600 to-indigo-400'}`}
                        style={{
                          width: `${stats.total ? ((stats.ratingBreakdown?.[rating] || 0) / stats.total) * 100 : 0}%`,
                          minWidth: stats.ratingBreakdown?.[rating] ? '60px' : '0'
                        }}
                      >
                        {stats.ratingBreakdown?.[rating] || 0}
                      </div>
                    </div>
                    <span className={`w-12 text-right text-sm font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {stats.total ? (((stats.ratingBreakdown?.[rating] || 0) / stats.total) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Feedback List */}
            <div className={`rounded-xl shadow-lg p-6 md:p-8 border-l-4 ${darkMode
              ? 'bg-slate-800 border-purple-500'
              : 'bg-white border-indigo-500'}`}>
              <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                <MessageSquare className={`w-6 h-6 ${darkMode ? 'text-purple-400' : 'text-indigo-600'}`} />
                Recent Feedback ({feedback.length})
              </h2>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className={`w-8 h-8 animate-spin ${darkMode ? 'text-purple-400' : 'text-indigo-600'}`} />
                  <span className={`ml-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading feedback...</span>
                </div>
              ) : feedback.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                  <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>No feedback yet for this group</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {feedback.map((item) => (
                    <div
                      key={item._id}
                      className={`border-2 rounded-lg p-5 transition ${darkMode
                        ? 'border-slate-700 bg-slate-700/50 hover:bg-slate-700 hover:border-purple-600'
                        : 'border-gray-200 bg-gradient-to-r from-gray-50 to-transparent hover:shadow-lg hover:border-indigo-300'}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className={`font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                            {item.isAnonymous ? '👤 Anonymous' : item.student?.name || 'Unknown'}
                          </p>
                          <p className={`text-xs mt-1 uppercase font-semibold ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            {item.category}
                          </p>
                        </div>
                        <div>{renderStars(item.rating)}</div>
                      </div>

                      {item.title && (
                        <p className={`font-semibold mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{item.title}</p>
                      )}

                      {item.comment && (
                        <p className={`mb-3 p-3 rounded border text-sm ${darkMode
                          ? 'text-gray-300 bg-slate-800 border-slate-600'
                          : 'text-gray-700 bg-white border-gray-200'}`}>
                          {item.comment}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          {new Date(item.createdAt).toLocaleDateString('en-IN')}
                        </span>
                        <div className="flex gap-3">
                          <span className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full border font-semibold ${darkMode
                            ? 'bg-green-900/30 text-green-400 border-green-800'
                            : 'bg-green-50 text-green-700 border-green-200'}`}>
                            <ThumbsUp className="w-3 h-3" /> {item.helpful || 0}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full border font-semibold ${darkMode
                            ? 'bg-red-900/30 text-red-400 border-red-800'
                            : 'bg-red-50 text-red-700 border-red-200'}`}>
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

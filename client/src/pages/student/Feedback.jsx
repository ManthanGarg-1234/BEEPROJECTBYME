import React, { useState, useEffect } from 'react';
import api from '../../api';
import { useTheme } from '../../context/ThemeContext';
import { Star, MessageSquare, CheckCircle, AlertCircle, Loader, Send } from 'lucide-react';

const FeedbackForm = () => {
  const { darkMode } = useTheme();
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    classId: '',
    rating: 5,
    category: 'teaching',
    title: '',
    comment: '',
    isAnonymous: true,
  });

  useEffect(() => {
    fetchClasses();
    fetchFeedback();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await api.get('/classes/my-classes');
      const classesData = response.data.data || [];
      setClasses(classesData);
      
      // Extract unique groups
      const groups = [...new Set(classesData.map(c => c.classId.split('-')[0]))].sort();
      if (groups.length > 0) {
        setSelectedGroup(groups[0]);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      setError('Failed to load classes');
    }
  };

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const response = await api.get('/feedback/my-feedback');
      setFeedback(response.data.data || []);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!formData.classId) {
      setError('Please select a class');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/feedback/submit', formData);
      setSuccess('Feedback submitted successfully! Thank you for your input.');
      setShowForm(false);
      setFormData({
        classId: '',
        rating: 5,
        category: 'teaching',
        title: '',
        comment: '',
        isAnonymous: true,
      });
      await fetchFeedback();
    } catch (error) {
      setError(error.response?.data?.message || 'Error submitting feedback');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const getGroupsFromClasses = () => {
    return [...new Set(classes.map(c => c.classId.split('-')[0]))].sort();
  };

  const getFilteredClasses = () => {
    if (!selectedGroup) return classes;
    return classes.filter(c => c.classId.startsWith(selectedGroup));
  };

  const renderStars = (rating) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
          />
        ))}
      </div>
    );
  };

  const categoryLabels = {
    teaching: 'Teaching Quality',
    'class-material': 'Class Material',
    pace: 'Pace & Difficulty',
    engagement: 'Engagement',
    overall: 'Overall'
  };

  const groups = getGroupsFromClasses();
  const filteredClasses = getFilteredClasses();

  return (
    <div className={`min-h-screen ${darkMode 
      ? 'dark bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
      : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50'} p-4 md:p-8 transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-4xl md:text-5xl font-bold ${darkMode 
            ? 'text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text' 
            : 'text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text'} mb-2`}>
            Feedback & Ratings
          </h1>
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-lg`}>
            Share your thoughts about classes and help us improve
          </p>
        </div>

        {/* New Feedback Button */}
        <div className="mb-8">
          <button
            onClick={() => { setShowForm(!showForm); setError(''); setSuccess(''); }}
            className={`px-6 py-3 ${darkMode 
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500' 
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'} text-white rounded-lg hover:shadow-lg transition font-semibold flex items-center gap-2`}
          >
            <MessageSquare className="w-5 h-5" /> 
            {showForm ? 'Cancel Feedback' : 'New Feedback'}
          </button>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className={`mb-6 p-4 ${darkMode 
            ? 'bg-red-900/30 border-red-700 text-red-300' 
            : 'bg-red-100 border-red-400 text-red-700'} border rounded-lg flex items-start gap-3`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}
        {success && (
          <div className={`mb-6 p-4 ${darkMode 
            ? 'bg-green-900/30 border-green-700 text-green-300' 
            : 'bg-green-100 border-green-400 text-green-700'} border rounded-lg flex items-start gap-3`}>
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>{success}</div>
          </div>
        )}

        {/* Feedback Form */}
        {showForm && (
          <div className={`${darkMode 
            ? 'bg-slate-800 border-indigo-500/30' 
            : 'bg-white'} rounded-xl shadow-lg p-6 md:p-8 mb-8 border-l-4 border-indigo-500 transition-colors duration-300`}>
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'} mb-6 flex items-center gap-2`}>
              <Send className="w-6 h-6 text-indigo-600" />
              Share Your Feedback
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Group Selection */}
              {groups.length > 1 && (
                <div>
                  <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2 uppercase`}>
                    Group
                  </label>
                  <select
                    value={selectedGroup}
                    onChange={(e) => {
                      setSelectedGroup(e.target.value);
                      setFormData({ ...formData, classId: '' });
                    }}
                    className={`w-full px-4 py-3 ${darkMode 
                      ? 'bg-slate-700 border-slate-600 text-gray-100 focus:border-indigo-500' 
                      : 'bg-white border-gray-300 text-gray-800 focus:border-indigo-500'} border-2 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none transition`}
                  >
                    {groups.map((group) => (
                      <option key={group} value={group}>
                        {group}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Class Selection */}
                <div>
                  <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2 uppercase`}>
                    Class *
                  </label>
                  <select
                    value={formData.classId}
                    onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                    className={`w-full px-4 py-3 ${darkMode 
                      ? 'bg-slate-700 border-slate-600 text-gray-100 focus:border-indigo-500' 
                      : 'bg-white border-gray-300 text-gray-800 focus:border-indigo-500'} border-2 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none transition`}
                  >
                    <option value="">Select a class</option>
                    {filteredClasses.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.classId} - {c.subject}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2 uppercase`}>
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className={`w-full px-4 py-3 ${darkMode 
                      ? 'bg-slate-700 border-slate-600 text-gray-100 focus:border-indigo-500' 
                      : 'bg-white border-gray-300 text-gray-800 focus:border-indigo-500'} border-2 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none transition`}
                  >
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2 uppercase`}>
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  maxLength="100"
                  placeholder="Brief title for your feedback..."
                  className={`w-full px-4 py-3 ${darkMode 
                    ? 'bg-slate-700 border-slate-600 text-gray-100 placeholder-gray-500 focus:border-indigo-500' 
                    : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-indigo-500'} border-2 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none transition`}
                />
              </div>

              {/* Rating */}
              <div className={`${darkMode 
                ? 'bg-slate-700/50 border-slate-600' 
                : 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200'} rounded-lg p-6 border transition-colors duration-300`}>
                <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-4 uppercase`}>
                  Rating *
                </label>
                <div className="flex gap-3 mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFormData({ ...formData, rating: i })}
                      className="focus:outline-none transition transform hover:scale-110"
                    >
                      <Star
                        className={`w-10 h-10 cursor-pointer transition ${
                          i <= formData.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : darkMode ? 'text-slate-500 hover:text-slate-400' : 'text-gray-300 hover:text-yellow-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {formData.rating === 5 && '⭐ Excellent!'}
                  {formData.rating === 4 && '⭐ Very Good'}
                  {formData.rating === 3 && '⭐ Good'}
                  {formData.rating === 2 && '⭐ Fair'}
                  {formData.rating === 1 && '⭐ Poor'}
                </p>
              </div>

              {/* Comments */}
              <div>
                <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2 uppercase`}>
                  Comments
                </label>
                <textarea
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  rows="5"
                  maxLength="500"
                  placeholder="Share your detailed thoughts and suggestions..."
                  className={`w-full px-4 py-3 ${darkMode 
                    ? 'bg-slate-700 border-slate-600 text-gray-100 placeholder-gray-500 focus:border-indigo-500' 
                    : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-indigo-500'} border-2 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none transition resize-none`}
                ></textarea>
                <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                  {formData.comment.length}/500 characters
                </p>
              </div>

              {/* Anonymous Checkbox */}
              <div className={`flex items-center gap-3 p-4 ${darkMode 
                ? 'bg-indigo-900/30 border-indigo-600' 
                : 'bg-blue-50 border-blue-200'} rounded-lg border transition-colors duration-300`}>
                <input
                  type="checkbox"
                  id="anonymous"
                  checked={formData.isAnonymous}
                  onChange={(e) => setFormData({ ...formData, isAnonymous: e.target.checked })}
                  className="w-5 h-5 cursor-pointer accent-indigo-600"
                />
                <label htmlFor="anonymous" className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} cursor-pointer font-medium`}>
                  Submit as anonymous (your name won't be shown)
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className={`w-full px-6 py-3 ${darkMode 
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500' 
                  : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700'} text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold flex items-center justify-center gap-2`}
              >
                {submitting ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Feedback
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* My Feedback List */}
        <div className={`${darkMode 
          ? 'bg-slate-800 border-indigo-500/30' 
          : 'bg-white'} rounded-xl shadow-lg p-6 md:p-8 border-l-4 border-indigo-500 transition-colors duration-300`}>
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'} mb-6 flex items-center gap-2`}>
            <MessageSquare className="w-6 h-6 text-indigo-600" />
            Your Feedback History ({feedback.length})
          </h2>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 text-indigo-600 animate-spin" />
              <span className={`ml-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Loading feedback...
              </span>
            </div>
          ) : feedback.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className={`w-12 h-12 ${darkMode ? 'text-slate-600' : 'text-gray-300'} mx-auto mb-4`} />
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-lg`}>
                No feedback submitted yet
              </p>
              <p className={darkMode ? 'text-gray-500' : 'text-gray-500'}>
                Start by sharing feedback about your classes
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {feedback.map((item) => (
                <div
                  key={item._id}
                  className={`${darkMode 
                    ? 'bg-gradient-to-r from-slate-700 to-transparent border-slate-600 hover:border-indigo-400' 
                    : 'bg-gradient-to-r from-gray-50 to-transparent border-gray-200 hover:border-indigo-300'} border-2 rounded-lg p-5 hover:shadow-lg transition`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className={`font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                        {item.title}
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'} mt-1 uppercase font-semibold`}>
                        {categoryLabels[item.category]} • {item.class?.classId} - {item.class?.subject}
                      </p>
                    </div>
                    <div>{renderStars(item.rating)}</div>
                  </div>

                  {item.comment && (
                    <p className={`mt-3 p-3 ${darkMode 
                      ? 'bg-slate-600 text-gray-200 border-slate-500' 
                      : 'bg-white text-gray-700 border-gray-200'} rounded border`}>
                      {item.comment}
                    </p>
                  )}

                  <div className={`flex items-center justify-between mt-3 pt-3 border-t ${darkMode ? 'border-slate-600' : 'border-gray-200'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        {new Date(item.createdAt).toLocaleDateString('en-IN')}
                      </span>
                      {item.isAnonymous && (
                        <span className={`inline-flex items-center text-xs px-2 py-1 ${darkMode 
                          ? 'bg-indigo-900/40 text-indigo-300 border-indigo-600' 
                          : 'bg-blue-100 text-blue-800 border-blue-200'} rounded-full font-semibold border`}>
                          👤 Anonymous
                        </span>
                      )}
                    </div>
                    <div className={`inline-flex items-center gap-2 text-xs px-3 py-1 ${darkMode 
                      ? 'bg-indigo-900/40 text-indigo-300 border-indigo-600' 
                      : 'bg-indigo-100 text-indigo-800 border-indigo-200'} rounded-full border font-semibold`}>
                      ✓ Submitted
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackForm;

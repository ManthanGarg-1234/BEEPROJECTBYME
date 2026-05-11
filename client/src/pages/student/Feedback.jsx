import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Star, MessageSquare, CheckCircle, AlertCircle, Loader, Send } from 'lucide-react';

const FeedbackForm = () => {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [classes, setClasses] = useState([]);
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
      setClasses(response.data.data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
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

  const categoryLabels = {
    teaching: 'Teaching Quality',
    'class-material': 'Class Material',
    pace: 'Pace & Difficulty',
    engagement: 'Engagement',
    overall: 'Overall'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Feedback & Ratings
          </h1>
          <p className="text-gray-600 text-lg">Share your thoughts about classes and help us improve</p>
        </div>

        {/* New Feedback Button */}
        <div className="mb-8">
          <button
            onClick={() => { setShowForm(!showForm); setError(''); setSuccess(''); }}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition font-semibold flex items-center gap-2"
          >
            <MessageSquare className="w-5 h-5" /> 
            {showForm ? 'Cancel Feedback' : 'New Feedback'}
          </button>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>{success}</div>
          </div>
        )}

        {/* Feedback Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-8 border-l-4 border-indigo-500">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Send className="w-6 h-6 text-indigo-600" />
              Share Your Feedback
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Class Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase">Class *</label>
                  <select
                    value={formData.classId}
                    onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                  >
                    <option value="">Select a class</option>
                    {classes.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.classId} - {c.subject}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                  >
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  maxLength="100"
                  placeholder="Brief title for your feedback..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                />
              </div>

              {/* Rating */}
              <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-6 border border-yellow-200">
                <label className="block text-sm font-semibold text-gray-700 mb-4 uppercase">Rating *</label>
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
                            : 'text-gray-300 hover:text-yellow-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-sm font-semibold text-gray-700">
                  {formData.rating === 5 && '⭐ Excellent!'}
                  {formData.rating === 4 && '⭐ Very Good'}
                  {formData.rating === 3 && '⭐ Good'}
                  {formData.rating === 2 && '⭐ Fair'}
                  {formData.rating === 1 && '⭐ Poor'}
                </p>
              </div>

              {/* Comments */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase">Comments</label>
                <textarea
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  rows="5"
                  maxLength="500"
                  placeholder="Share your detailed thoughts and suggestions..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition resize-none"
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">{formData.comment.length}/500 characters</p>
              </div>

              {/* Anonymous Checkbox */}
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <input
                  type="checkbox"
                  id="anonymous"
                  checked={formData.isAnonymous}
                  onChange={(e) => setFormData({ ...formData, isAnonymous: e.target.checked })}
                  className="w-5 h-5 cursor-pointer accent-indigo-600"
                />
                <label htmlFor="anonymous" className="text-sm text-gray-700 cursor-pointer font-medium">
                  Submit as anonymous (your name won't be shown)
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold flex items-center justify-center gap-2"
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
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 border-l-4 border-indigo-500">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-indigo-600" />
            Your Feedback History ({feedback.length})
          </h2>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 text-indigo-600 animate-spin" />
              <span className="ml-3 text-gray-600">Loading feedback...</span>
            </div>
          ) : feedback.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No feedback submitted yet</p>
              <p className="text-gray-500">Start by sharing feedback about your classes</p>
            </div>
          ) : (
            <div className="space-y-4">
              {feedback.map((item) => (
                <div
                  key={item._id}
                  className="border-2 border-gray-200 rounded-lg p-5 hover:shadow-lg hover:border-indigo-300 transition bg-gradient-to-r from-gray-50 to-transparent"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="font-bold text-gray-800">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-1 uppercase font-semibold">
                        {categoryLabels[item.category]} • {item.class?.classId} - {item.class?.subject}
                      </p>
                    </div>
                    <div>{renderStars(item.rating)}</div>
                  </div>

                  {item.comment && (
                    <p className="text-gray-700 mt-3 p-3 bg-white rounded border border-gray-200">
                      {item.comment}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {new Date(item.createdAt).toLocaleDateString('en-IN')}
                      </span>
                      {item.isAnonymous && (
                        <span className="inline-flex items-center text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-semibold border border-blue-200">
                          👤 Anonymous
                        </span>
                      )}
                    </div>
                    <div className="inline-flex items-center gap-2 text-xs px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full border border-indigo-200 font-semibold">
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

import React, { useState, useEffect } from 'react';
import api from '../../api';
import { useTheme } from '../../context/ThemeContext';
import { AlertTriangle, Eye, Flag, Loader } from 'lucide-react';

const SuspiciousActivityMonitor = () => {
  const { darkMode } = useTheme();
  const [activities, setActivities] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [flagReason, setFlagReason] = useState('');
  const [tab, setTab] = useState('reports');

  useEffect(() => {
    if (tab === 'reports') {
      fetchSuspiciousActivities();
    } else if (tab === 'patterns') {
      analyzePatterns();
    }
  }, [tab]);

  const fetchSuspiciousActivities = async () => {
    setLoading(true);
    try {
      const response = await api.get('/suspicious/reports');
      setActivities(response.data.data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzePatterns = async () => {
    setLoading(true);
    try {
      const response = await api.post('/suspicious/analyze-patterns', {});
      setPatterns(response.data.data || []);
    } catch (error) {
      console.error('Error analyzing patterns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFlag = async () => {
    try {
      await api.post(`/suspicious/flag/${selectedActivity._id}`, { flagReason });
      alert('Activity flagged for review!');
      setSelectedActivity(null);
      setFlagReason('');
      fetchSuspiciousActivities();
    } catch (error) {
      alert('Error flagging activity');
      console.error(error);
    }
  };

  const getRiskColor = (risk) => {
    if (darkMode) {
      switch (risk) {
        case 'critical':
          return 'bg-red-900/30 border-red-600 text-red-300';
        case 'high':
          return 'bg-orange-900/30 border-orange-600 text-orange-300';
        case 'medium':
          return 'bg-yellow-900/30 border-yellow-600 text-yellow-300';
        default:
          return 'bg-green-900/30 border-green-600 text-green-300';
      }
    } else {
      switch (risk) {
        case 'critical':
          return 'bg-red-100 text-red-800 border-red-300';
        case 'high':
          return 'bg-orange-100 text-orange-800 border-orange-300';
        case 'medium':
          return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        default:
          return 'bg-green-100 text-green-800 border-green-300';
      }
    }
  };

  const getReasonBadgeColor = (reason) => {
    if (darkMode) {
      const colors = {
        GPS_OUT_OF_RANGE: 'bg-red-900/40 text-red-300',
        INVALID_QR: 'bg-orange-900/40 text-orange-300',
        DUPLICATE_ATTENDANCE: 'bg-pink-900/40 text-pink-300',
        EXPIRED_QR: 'bg-yellow-900/40 text-yellow-300',
      };
      return colors[reason] || 'bg-slate-700 text-slate-200';
    } else {
      const colors = {
        GPS_OUT_OF_RANGE: 'bg-red-200 text-red-800',
        INVALID_QR: 'bg-orange-200 text-orange-800',
        DUPLICATE_ATTENDANCE: 'bg-pink-200 text-pink-800',
        EXPIRED_QR: 'bg-yellow-200 text-yellow-800',
      };
      return colors[reason] || 'bg-gray-200 text-gray-800';
    }
  };

  return (
    <div className={`min-h-screen ${darkMode 
      ? 'dark bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
      : 'bg-gradient-to-br from-blue-50 to-indigo-100'} p-6 transition-colors duration-300`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-4xl font-bold ${darkMode 
            ? 'text-transparent bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text' 
            : 'text-gray-800'}`}>
            Suspicious Activity Monitor
          </h1>
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-2`}>
            Track and manage suspicious attendance patterns
          </p>
        </div>

        {/* Tabs */}
        <div className={`${darkMode 
          ? 'bg-slate-800 border-slate-700' 
          : 'bg-white'} rounded-lg shadow-md p-6 mb-8 transition-colors duration-300`}>
          <div className={`flex gap-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
            <button
              onClick={() => setTab('reports')}
              className={`px-4 py-2 font-semibold transition-colors duration-300 flex items-center gap-2 ${
                tab === 'reports'
                  ? darkMode
                    ? 'border-b-2 border-red-500 text-red-400'
                    : 'border-b-2 border-red-600 text-red-600'
                  : darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Eye className="w-4 h-4" /> Activity Reports
            </button>
            <button
              onClick={() => setTab('patterns')}
              className={`px-4 py-2 font-semibold transition-colors duration-300 flex items-center gap-2 ${
                tab === 'patterns'
                  ? darkMode
                    ? 'border-b-2 border-orange-500 text-orange-400'
                    : 'border-b-2 border-orange-600 text-orange-600'
                  : darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <AlertTriangle className="w-4 h-4" /> Pattern Analysis
            </button>
          </div>

          {/* Activity Reports Tab */}
          {tab === 'reports' && (
            <div className="mt-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="w-8 h-8 text-red-600 animate-spin" />
                  <span className={`ml-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Loading...
                  </span>
                </div>
              ) : activities.length === 0 ? (
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  No suspicious activities detected
                </p>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div
                      key={activity._id}
                      className={`border-l-4 border-red-500 ${darkMode 
                        ? 'bg-slate-700/50 hover:bg-slate-700' 
                        : 'bg-white hover:shadow-md'} rounded-lg p-4 transition cursor-pointer`}
                      onClick={() => setSelectedActivity(activity)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className={`font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                            {activity.student?.name}
                          </p>
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getReasonBadgeColor(activity.reason)}`}>
                              {activity.reason.replace(/_/g, ' ')}
                            </span>
                            <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                              {new Date(activity.createdAt).toLocaleString('en-IN')}
                            </span>
                          </div>
                          {activity.details && (
                            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-sm mt-2`}>
                              {activity.details}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedActivity(activity);
                          }}
                          className={`px-3 py-1 ${darkMode 
                            ? 'bg-red-900/40 text-red-400 hover:bg-red-900/60' 
                            : 'bg-red-100 text-red-700 hover:bg-red-200'} rounded-lg transition`}
                        >
                          Flag
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pattern Analysis Tab */}
          {tab === 'patterns' && (
            <div className="mt-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="w-8 h-8 text-orange-600 animate-spin" />
                  <span className={`ml-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Analyzing patterns...
                  </span>
                </div>
              ) : patterns.length === 0 ? (
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  No suspicious patterns detected in the last 24 hours
                </p>
              ) : (
                <div className="space-y-4">
                  {patterns.map((pattern, idx) => (
                    <div
                      key={idx}
                      className={`border-l-4 rounded-lg p-4 transition-colors duration-300 ${getRiskColor(pattern.risk)}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`font-semibold ${darkMode ? 'text-gray-100' : ''}`}>
                            {pattern.student?.name}
                          </p>
                          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-300' : ''}`}>
                            {pattern.incidents.length} incidents in last 24 hours
                          </p>
                          <div className="mt-2 flex gap-2 flex-wrap">
                            {pattern.incidents.map((inc, i) => (
                              <span key={i} className={`text-xs ${darkMode 
                                ? 'bg-slate-700/50 text-gray-300' 
                                : 'bg-white bg-opacity-50'} px-2 py-1 rounded`}>
                                {inc.reason.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold uppercase ${darkMode ? 'text-gray-100' : ''}`}>
                            {pattern.risk}
                          </p>
                          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : ''}`}>
                            Risk Level
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Flag Modal */}
        {selectedActivity && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`${darkMode 
              ? 'bg-slate-800' 
              : 'bg-white'} rounded-lg shadow-lg p-8 max-w-md w-full transition-colors duration-300`}>
              <h2 className={`text-2xl font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-800'} mb-4 flex items-center gap-2`}>
                <Flag className="w-6 h-6 text-red-600" /> Flag Activity
              </h2>
              <div className={`mb-6 p-4 ${darkMode 
                ? 'bg-slate-700/50' 
                : 'bg-gray-50'} rounded-lg transition-colors duration-300`}>
                <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  <strong>Student:</strong> {selectedActivity.student?.name}
                </p>
                <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  <strong>Reason:</strong> {selectedActivity.reason.replace(/_/g, ' ')}
                </p>
                <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                  <strong>Time:</strong> {new Date(selectedActivity.createdAt).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="mb-6">
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Flag Reason
                </label>
                <textarea
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  rows="3"
                  className={`w-full px-4 py-2 ${darkMode 
                    ? 'bg-slate-700 border-slate-600 text-gray-100 placeholder-gray-500 focus:border-red-500' 
                    : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-red-500'} border rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition`}
                  placeholder="Why are you flagging this activity?"
                ></textarea>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleFlag}
                  className={`flex-1 px-4 py-2 ${darkMode 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-red-600 hover:bg-red-700'} text-white rounded-lg transition font-semibold`}
                >
                  Flag for Review
                </button>
                <button
                  onClick={() => {
                    setSelectedActivity(null);
                    setFlagReason('');
                  }}
                  className={`flex-1 px-4 py-2 ${darkMode 
                    ? 'bg-slate-700 hover:bg-slate-600 text-gray-200' 
                    : 'bg-gray-300 hover:bg-gray-400 text-gray-800'} rounded-lg transition font-semibold`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuspiciousActivityMonitor;

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, Eye, Flag } from 'lucide-react';

const SuspiciousActivityMonitor = () => {
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
      const response = await axios.get('http://localhost:5000/api/suspicious/reports', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
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
      const response = await axios.post(
        'http://localhost:5000/api/suspicious/analyze-patterns',
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setPatterns(response.data.data || []);
    } catch (error) {
      console.error('Error analyzing patterns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFlag = async () => {
    try {
      await axios.post(
        `http://localhost:5000/api/suspicious/flag/${selectedActivity._id}`,
        { flagReason },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
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
  };

  const getReasonBadgeColor = (reason) => {
    const colors = {
      GPS_OUT_OF_RANGE: 'bg-red-200 text-red-800',
      INVALID_QR: 'bg-orange-200 text-orange-800',
      DUPLICATE_ATTENDANCE: 'bg-pink-200 text-pink-800',
      EXPIRED_QR: 'bg-yellow-200 text-yellow-800',
    };
    return colors[reason] || 'bg-gray-200 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800">Suspicious Activity Monitor</h1>
          <p className="text-gray-600 mt-2">Track and manage suspicious attendance patterns</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex gap-4 border-b border-gray-200">
            <button
              onClick={() => setTab('reports')}
              className={`px-4 py-2 font-semibold ${
                tab === 'reports'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Eye className="w-4 h-4 inline mr-2" /> Activity Reports
            </button>
            <button
              onClick={() => setTab('patterns')}
              className={`px-4 py-2 font-semibold ${
                tab === 'patterns'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <AlertTriangle className="w-4 h-4 inline mr-2" /> Pattern Analysis
            </button>
          </div>

          {/* Activity Reports Tab */}
          {tab === 'reports' && (
            <div className="mt-6">
              {loading ? (
                <p className="text-gray-600">Loading...</p>
              ) : activities.length === 0 ? (
                <p className="text-gray-600">No suspicious activities detected</p>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div
                      key={activity._id}
                      className="border-l-4 border-red-500 bg-white rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                      onClick={() => setSelectedActivity(activity)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">
                            {activity.student?.name}
                          </p>
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getReasonBadgeColor(activity.reason)}`}>
                              {activity.reason.replace(/_/g, ' ')}
                            </span>
                            <span className="text-xs text-gray-600">
                              {new Date(activity.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {activity.details && (
                            <p className="text-gray-600 text-sm mt-2">{activity.details}</p>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedActivity(activity);
                          }}
                          className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition"
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
                <p className="text-gray-600">Analyzing patterns...</p>
              ) : patterns.length === 0 ? (
                <p className="text-gray-600">No suspicious patterns detected in the last 24 hours</p>
              ) : (
                <div className="space-y-4">
                  {patterns.map((pattern, idx) => (
                    <div
                      key={idx}
                      className={`border-l-4 rounded-lg p-4 ${getRiskColor(pattern.risk)}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">
                            {pattern.student?.name}
                          </p>
                          <p className="text-sm mt-1">
                            {pattern.incidents.length} incidents in last 24 hours
                          </p>
                          <div className="mt-2 flex gap-2 flex-wrap">
                            {pattern.incidents.map((inc, i) => (
                              <span key={i} className="text-xs bg-white bg-opacity-50 px-2 py-1 rounded">
                                {inc.reason.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold uppercase">{pattern.risk}</p>
                          <p className="text-xs mt-1">Risk Level</p>
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Flag className="w-6 h-6 text-red-600" /> Flag Activity
              </h2>
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-700 mb-2">
                  <strong>Student:</strong> {selectedActivity.student?.name}
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Reason:</strong> {selectedActivity.reason.replace(/_/g, ' ')}
                </p>
                <p className="text-gray-700">
                  <strong>Time:</strong> {new Date(selectedActivity.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Flag Reason
                </label>
                <textarea
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Why are you flagging this activity?"
                ></textarea>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleFlag}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                >
                  Flag for Review
                </button>
                <button
                  onClick={() => {
                    setSelectedActivity(null);
                    setFlagReason('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition font-semibold"
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

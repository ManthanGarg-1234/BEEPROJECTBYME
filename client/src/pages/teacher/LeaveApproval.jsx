import React, { useState, useEffect } from 'react';
import api from '../../api';
import { useTheme } from '../../context/ThemeContext';
import { CheckCircle, XCircle, Calendar, Clock, FileText, Loader, AlertCircle } from 'lucide-react';

const LeaveApproval = () => {
  const { darkMode } = useTheme();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [classId, setClassId] = useState('');
  const [classes, setClasses] = useState([]);
  const [classesError, setClassesError] = useState('');
  const [leavesError, setLeavesError] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (classId) {
      fetchLeaveRequests();
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

  const fetchLeaveRequests = async () => {
    setLoading(true);
    setLeavesError('');
    try {
      const response = await api.get(`/leave/class/${classId}`);
      setLeaves(response.data.data || []);
    } catch (error) {
      console.error('Error fetching leaves:', error);
      const msg = error.response?.data?.message || 'Failed to load leave requests';
      setLeavesError(msg);
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setActionError('');
      await api.put(`/leave/approve/${selectedLeave._id}`, { approvalNotes });
      setSelectedLeave(null);
      setApprovalNotes('');
      await fetchLeaveRequests();
    } catch (error) {
      console.error('Error approving leave:', error);
      setActionError(error.response?.data?.message || 'Failed to approve leave request');
    }
  };

  const handleReject = async () => {
    try {
      setActionError('');
      await api.put(`/leave/reject/${selectedLeave._id}`, { approvalNotes });
      setSelectedLeave(null);
      setApprovalNotes('');
      await fetchLeaveRequests();
    } catch (error) {
      console.error('Error rejecting leave:', error);
      setActionError(error.response?.data?.message || 'Failed to reject leave request');
    }
  };

  const pendingLeaves = leaves.filter((l) => l.status === 'pending');
  const approvedLeaves = leaves.filter((l) => l.status === 'approved');
  const rejectedLeaves = leaves.filter((l) => l.status === 'rejected');

  const leaveTypeLabels = {
    medical: 'Medical',
    personal: 'Personal',
    emergency: 'Emergency',
    event: 'Event',
    other: 'Other'
  };

  // Format: "G18-BE" → "Group G18 · Backend Engineering"
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
            ? 'bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent'}`}>
            Leave Approval
          </h1>
          <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Manage student leave requests
          </p>
        </div>

        {/* Group / Class Selection */}
        <div className={`rounded-xl shadow-lg p-6 md:p-8 mb-8 border-t-4 ${darkMode
          ? 'bg-slate-800 border-blue-500'
          : 'bg-white border-blue-500'}`}>
          <label className={`block text-sm font-semibold mb-3 uppercase tracking-wide ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Select Group / Class
          </label>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 outline-none transition ${darkMode
              ? 'bg-slate-700 border-slate-600 text-gray-100 focus:border-blue-500 focus:ring-blue-500/20'
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

        {/* Stats Cards */}
        {classId && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className={`rounded-xl shadow-lg p-6 border ${darkMode
              ? 'bg-gradient-to-br from-yellow-900/40 to-yellow-800/40 border-yellow-700'
              : 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <p className={`text-sm font-semibold uppercase ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Pending</p>
                <Clock className={`w-6 h-6 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
              </div>
              <p className={`text-4xl font-bold ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>{pendingLeaves.length}</p>
              <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Awaiting approval</p>
            </div>
            <div className={`rounded-xl shadow-lg p-6 border ${darkMode
              ? 'bg-gradient-to-br from-green-900/40 to-green-800/40 border-green-700'
              : 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <p className={`text-sm font-semibold uppercase ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Approved</p>
                <CheckCircle className={`w-6 h-6 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
              </div>
              <p className={`text-4xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{approvedLeaves.length}</p>
              <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Requests approved</p>
            </div>
            <div className={`rounded-xl shadow-lg p-6 border ${darkMode
              ? 'bg-gradient-to-br from-red-900/40 to-red-800/40 border-red-700'
              : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <p className={`text-sm font-semibold uppercase ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Rejected</p>
                <XCircle className={`w-6 h-6 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
              </div>
              <p className={`text-4xl font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>{rejectedLeaves.length}</p>
              <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Requests rejected</p>
            </div>
          </div>
        )}

        {/* Pending Requests */}
        <div className={`rounded-xl shadow-lg p-6 md:p-8 mb-8 border-l-4 ${darkMode
          ? 'bg-slate-800 border-indigo-500'
          : 'bg-white border-indigo-500'}`}>
          <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
            <FileText className={`w-6 h-6 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            Pending Leave Requests
          </h2>
          {leavesError && (
            <div className={`mb-6 p-4 border rounded-lg flex items-start gap-3 ${darkMode ? 'bg-red-900/30 border-red-700 text-red-300' : 'bg-red-100 border-red-400 text-red-700'}`}>
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{leavesError}</span>
            </div>
          )}
          {!classId ? (
            <div className="text-center py-12">
              <Calendar className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Select a group above to view leave requests</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className={`w-8 h-8 animate-spin ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
              <span className={`ml-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading requests...</span>
            </div>
          ) : pendingLeaves.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>No pending leave requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingLeaves.map((leave) => (
                <div
                  key={leave._id}
                  onClick={() => setSelectedLeave(leave)}
                  className={`border-2 rounded-lg p-5 cursor-pointer group transition ${darkMode
                    ? 'border-yellow-700/50 bg-yellow-900/20 hover:bg-yellow-900/30 hover:border-yellow-600'
                    : 'border-yellow-200 bg-gradient-to-r from-yellow-50 to-transparent hover:shadow-lg hover:border-yellow-400'}`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="md:col-span-1">
                      <p className={`text-xs font-semibold uppercase mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Student</p>
                      <p className={`font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{leave.student?.name}</p>
                      <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{leave.student?.rollNumber}</p>
                    </div>
                    <div className="md:col-span-1">
                      <p className={`text-xs font-semibold uppercase mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Type</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${darkMode
                        ? 'bg-blue-900/40 text-blue-300'
                        : 'bg-blue-100 text-blue-800'}`}>
                        {leaveTypeLabels[leave.leaveType] || leave.leaveType}
                      </span>
                    </div>
                    <div className="md:col-span-1">
                      <p className={`text-xs font-semibold uppercase mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Duration</p>
                      <p className={`font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{leave.numberOfDays} days</p>
                    </div>
                    <div className="md:col-span-1">
                      <p className={`text-xs font-semibold uppercase mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Dates</p>
                      <p className={`text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        {new Date(leave.startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} –{' '}
                        {new Date(leave.endDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <div className="md:col-span-1 flex items-end">
                      <button className={`w-full px-4 py-2 rounded-lg font-semibold text-sm transition ${darkMode
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
                        Review
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Approval Modal */}
        {selectedLeave && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className={`rounded-xl shadow-2xl p-8 max-w-lg w-full ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
              <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                <FileText className={`w-6 h-6 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                Leave Review
              </h2>

              {actionError && (
                <div className={`mb-6 p-4 border rounded-lg flex items-start gap-3 ${darkMode ? 'bg-red-900/30 border-red-700 text-red-300' : 'bg-red-100 border-red-400 text-red-700'}`}>
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{actionError}</span>
                </div>
              )}

              <div className={`rounded-lg p-5 mb-6 space-y-3 ${darkMode ? 'bg-slate-700/50' : 'bg-gradient-to-r from-gray-50 to-gray-100'}`}>
                <div>
                  <p className={`text-xs font-semibold uppercase ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Student</p>
                  <p className={`text-lg font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{selectedLeave.student?.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className={`text-xs font-semibold uppercase ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Start Date</p>
                    <p className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{new Date(selectedLeave.startDate).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div>
                    <p className={`text-xs font-semibold uppercase ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>End Date</p>
                    <p className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{new Date(selectedLeave.endDate).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
                <div>
                  <p className={`text-xs font-semibold uppercase ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Duration</p>
                  <p className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{selectedLeave.numberOfDays} days</p>
                </div>
                <div>
                  <p className={`text-xs font-semibold uppercase ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Type</p>
                  <p className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{leaveTypeLabels[selectedLeave.leaveType]}</p>
                </div>
                <div>
                  <p className={`text-xs font-semibold uppercase ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Reason</p>
                  <p className={`mt-1 p-3 rounded border text-sm ${darkMode
                    ? 'text-gray-300 bg-slate-800 border-slate-600'
                    : 'text-gray-700 bg-white border-gray-200'}`}>{selectedLeave.reason}</p>
                </div>
              </div>

              <div className="mb-6">
                <label className={`block text-sm font-bold mb-3 uppercase ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Approval Notes</label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows="4"
                  maxLength="500"
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 outline-none transition resize-none ${darkMode
                    ? 'bg-slate-700 border-slate-600 text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:ring-indigo-500/20'
                    : 'bg-white border-gray-300 text-gray-800 focus:border-indigo-500 focus:ring-indigo-200'}`}
                  placeholder="Add approval or rejection notes..."
                />
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{approvalNotes.length}/500 characters</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleApprove}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:shadow-lg transition font-bold flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" /> Approve
                </button>
                <button
                  onClick={handleReject}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:shadow-lg transition font-bold flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" /> Reject
                </button>
                <button
                  onClick={() => { setSelectedLeave(null); setApprovalNotes(''); setActionError(''); }}
                  className={`flex-1 px-4 py-3 rounded-lg transition font-bold ${darkMode
                    ? 'bg-slate-600 hover:bg-slate-500 text-gray-200'
                    : 'bg-gray-300 hover:bg-gray-400 text-gray-800'}`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Approved & Rejected Lists */}
        {classId && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className={`rounded-xl shadow-lg p-6 md:p-8 border-l-4 ${darkMode
              ? 'bg-slate-800 border-green-500'
              : 'bg-white border-green-500'}`}>
              <h3 className={`text-xl font-bold mb-6 flex items-center gap-2 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                <CheckCircle className={`w-6 h-6 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                Approved Leaves ({approvedLeaves.length})
              </h3>
              {approvedLeaves.length === 0 ? (
                <p className={`text-center py-8 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>No approved leaves yet</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {approvedLeaves.map((leave) => (
                    <div key={leave._id} className={`flex items-start gap-3 p-3 rounded-lg border ${darkMode
                      ? 'bg-green-900/20 border-green-800'
                      : 'bg-green-50 border-green-200'}`}>
                      <CheckCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{leave.student?.name} <span className="text-xs font-normal opacity-70 ml-1">({leaveTypeLabels[leave.leaveType] || leave.leaveType})</span></p>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {leave.numberOfDays} days • {new Date(leave.startDate).toLocaleDateString('en-IN')} to {new Date(leave.endDate).toLocaleDateString('en-IN')}
                        </p>
                        {(leave.reason || leave.approvalNotes) && (
                          <div className={`mt-2 p-2 rounded text-xs ${darkMode ? 'bg-green-900/40 text-green-300' : 'bg-white/60 text-gray-600'}`}>
                            {leave.reason && <p><span className="font-semibold">Reason:</span> {leave.reason}</p>}
                            {leave.approvalNotes && <p className="mt-1"><span className="font-semibold">Note:</span> {leave.approvalNotes}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={`rounded-xl shadow-lg p-6 md:p-8 border-l-4 ${darkMode
              ? 'bg-slate-800 border-red-500'
              : 'bg-white border-red-500'}`}>
              <h3 className={`text-xl font-bold mb-6 flex items-center gap-2 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                <XCircle className={`w-6 h-6 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
                Rejected Leaves ({rejectedLeaves.length})
              </h3>
              {rejectedLeaves.length === 0 ? (
                <p className={`text-center py-8 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>No rejected leaves yet</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {rejectedLeaves.map((leave) => (
                    <div key={leave._id} className={`flex items-start gap-3 p-3 rounded-lg border ${darkMode
                      ? 'bg-red-900/20 border-red-800'
                      : 'bg-red-50 border-red-200'}`}>
                      <XCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{leave.student?.name} <span className="text-xs font-normal opacity-70 ml-1">({leaveTypeLabels[leave.leaveType] || leave.leaveType})</span></p>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {leave.numberOfDays} days • {new Date(leave.startDate).toLocaleDateString('en-IN')} to {new Date(leave.endDate).toLocaleDateString('en-IN')}
                        </p>
                        {(leave.reason || leave.approvalNotes) && (
                          <div className={`mt-2 p-2 rounded text-xs ${darkMode ? 'bg-red-900/40 text-red-300' : 'bg-white/60 text-gray-600'}`}>
                            {leave.reason && <p><span className="font-semibold">Reason:</span> {leave.reason}</p>}
                            {leave.approvalNotes && <p className="mt-1"><span className="font-semibold">Note:</span> {leave.approvalNotes}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveApproval;

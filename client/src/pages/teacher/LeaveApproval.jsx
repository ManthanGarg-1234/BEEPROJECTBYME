import React, { useState, useEffect } from 'react';
import api from '../../api';
import { CheckCircle, XCircle, Calendar, Clock, FileText, Loader } from 'lucide-react';

const LeaveApproval = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [classId, setClassId] = useState('');
  const [classes, setClasses] = useState([]);

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
      const response = await api.get('/classes/my-classes');
      setClasses(response.data.data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchLeaveRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/leave/class/${classId}`);
      setLeaves(response.data.data || []);
    } catch (error) {
      console.error('Error fetching leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      await api.put(`/leave/approve/${selectedLeave._id}`, { approvalNotes });
      setSelectedLeave(null);
      setApprovalNotes('');
      await fetchLeaveRequests();
    } catch (error) {
      console.error('Error approving leave:', error);
    }
  };

  const handleReject = async () => {
    try {
      await api.put(`/leave/reject/${selectedLeave._id}`, { approvalNotes });
      setSelectedLeave(null);
      setApprovalNotes('');
      await fetchLeaveRequests();
    } catch (error) {
      console.error('Error rejecting leave:', error);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Leave Approval
          </h1>
          <p className="text-gray-600 text-lg">Review and manage student leave requests</p>
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

        {/* Stats Cards */}
        {classId && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-lg p-6 border border-yellow-200">
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-700 text-sm font-semibold uppercase">Pending</p>
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <p className="text-4xl font-bold text-yellow-600">{pendingLeaves.length}</p>
              <p className="text-xs text-gray-600 mt-2">Awaiting approval</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-lg p-6 border border-green-200">
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-700 text-sm font-semibold uppercase">Approved</p>
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-4xl font-bold text-green-600">{approvedLeaves.length}</p>
              <p className="text-xs text-gray-600 mt-2">Requests approved</p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-lg p-6 border border-red-200">
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-700 text-sm font-semibold uppercase">Rejected</p>
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <p className="text-4xl font-bold text-red-600">{rejectedLeaves.length}</p>
              <p className="text-xs text-gray-600 mt-2">Requests rejected</p>
            </div>
          </div>
        )}

        {/* Pending Requests */}
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-8 border-l-4 border-indigo-500">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            Pending Leave Requests
          </h2>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 text-indigo-600 animate-spin" />
              <span className="ml-3 text-gray-600">Loading requests...</span>
            </div>
          ) : pendingLeaves.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No pending leave requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingLeaves.map((leave) => (
                <div
                  key={leave._id}
                  onClick={() => setSelectedLeave(leave)}
                  className="border-2 border-yellow-200 bg-gradient-to-r from-yellow-50 to-transparent rounded-lg p-5 hover:shadow-lg hover:border-yellow-400 transition cursor-pointer group"
                >
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="md:col-span-1">
                      <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Student</p>
                      <p className="font-bold text-gray-800">{leave.student?.name}</p>
                      <p className="text-xs text-gray-500">{leave.student?.rollNumber}</p>
                    </div>
                    <div className="md:col-span-1">
                      <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Type</p>
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                        {leaveTypeLabels[leave.leaveType] || leave.leaveType}
                      </span>
                    </div>
                    <div className="md:col-span-1">
                      <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Duration</p>
                      <p className="font-bold text-gray-800">{leave.numberOfDays} days</p>
                    </div>
                    <div className="md:col-span-1">
                      <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Dates</p>
                      <p className="text-sm text-gray-800 font-semibold">
                        {new Date(leave.startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} -{' '}
                        {new Date(leave.endDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <div className="md:col-span-1 flex items-end">
                      <button className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold text-sm group-hover:shadow-lg">
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <FileText className="w-6 h-6 text-indigo-600" />
                Leave Review
              </h2>
              
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-5 mb-6 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase">Student</p>
                  <p className="text-lg font-bold text-gray-800">{selectedLeave.student?.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase">Start Date</p>
                    <p className="font-semibold text-gray-800">{new Date(selectedLeave.startDate).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase">End Date</p>
                    <p className="font-semibold text-gray-800">{new Date(selectedLeave.endDate).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase">Duration</p>
                  <p className="font-semibold text-gray-800">{selectedLeave.numberOfDays} days</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase">Type</p>
                  <p className="font-semibold text-gray-800">{leaveTypeLabels[selectedLeave.leaveType]}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase">Reason</p>
                  <p className="text-gray-700 mt-1 p-3 bg-white rounded border border-gray-200">{selectedLeave.reason}</p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-3 uppercase">Approval Notes</label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows="4"
                  maxLength="500"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition resize-none"
                  placeholder="Add approval or rejection notes..."
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">{approvalNotes.length}/500 characters</p>
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
                  onClick={() => {
                    setSelectedLeave(null);
                    setApprovalNotes('');
                  }}
                  className="flex-1 px-4 py-3 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition font-bold"
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
            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 border-l-4 border-green-500">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
                Approved Leaves ({approvedLeaves.length})
              </h3>
              {approvedLeaves.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No approved leaves yet</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {approvedLeaves.map((leave) => (
                    <div key={leave._id} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800">{leave.student?.name}</p>
                        <p className="text-xs text-gray-600">
                          {leave.numberOfDays} days • {new Date(leave.startDate).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 border-l-4 border-red-500">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <XCircle className="w-6 h-6 text-red-600" />
                Rejected Leaves ({rejectedLeaves.length})
              </h3>
              {rejectedLeaves.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No rejected leaves yet</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {rejectedLeaves.map((leave) => (
                    <div key={leave._id} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800">{leave.student?.name}</p>
                        <p className="text-xs text-gray-600">
                          {leave.numberOfDays} days • {new Date(leave.startDate).toLocaleDateString('en-IN')}
                        </p>
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

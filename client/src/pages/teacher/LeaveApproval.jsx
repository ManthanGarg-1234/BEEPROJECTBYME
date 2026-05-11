import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle, XCircle } from 'lucide-react';

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
      const response = await axios.get('http://localhost:5000/api/classes', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setClasses(response.data.data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchLeaveRequests = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:5000/api/leave/class/${classId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setLeaves(response.data.data || []);
    } catch (error) {
      console.error('Error fetching leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      await axios.put(
        `http://localhost:5000/api/leave/approve/${selectedLeave._id}`,
        { approvalNotes },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      alert('Leave approved!');
      setSelectedLeave(null);
      setApprovalNotes('');
      fetchLeaveRequests();
    } catch (error) {
      alert('Error approving leave');
      console.error(error);
    }
  };

  const handleReject = async () => {
    try {
      await axios.put(
        `http://localhost:5000/api/leave/reject/${selectedLeave._id}`,
        { approvalNotes },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      alert('Leave rejected!');
      setSelectedLeave(null);
      setApprovalNotes('');
      fetchLeaveRequests();
    } catch (error) {
      alert('Error rejecting leave');
      console.error(error);
    }
  };

  const pendingLeaves = leaves.filter((l) => l.status === 'pending');
  const approvedLeaves = leaves.filter((l) => l.status === 'approved');
  const rejectedLeaves = leaves.filter((l) => l.status === 'rejected');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800">Leave Approval</h1>
          <p className="text-gray-600 mt-2">Manage student leave requests</p>
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

        {/* Stats */}
        {classId && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-yellow-100 rounded-lg p-4 text-center">
              <p className="text-gray-600 text-sm">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingLeaves.length}</p>
            </div>
            <div className="bg-green-100 rounded-lg p-4 text-center">
              <p className="text-gray-600 text-sm">Approved</p>
              <p className="text-2xl font-bold text-green-600">{approvedLeaves.length}</p>
            </div>
            <div className="bg-red-100 rounded-lg p-4 text-center">
              <p className="text-gray-600 text-sm">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{rejectedLeaves.length}</p>
            </div>
          </div>
        )}

        {/* Pending Requests */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Pending Requests</h2>
          {loading ? (
            <p className="text-gray-600">Loading...</p>
          ) : pendingLeaves.length === 0 ? (
            <p className="text-gray-600">No pending requests</p>
          ) : (
            <div className="space-y-4">
              {pendingLeaves.map((leave) => (
                <div
                  key={leave._id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                  onClick={() => setSelectedLeave(leave)}
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Student</p>
                      <p className="font-semibold text-gray-800">{leave.studentId?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Date Range</p>
                      <p className="font-semibold text-gray-800">
                        {new Date(leave.startDate).toLocaleDateString()} -{' '}
                        {new Date(leave.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Days</p>
                      <p className="font-semibold text-gray-800">{leave.numberOfDays}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Reason</p>
                      <p className="font-semibold text-gray-800">{leave.reason}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Approval Modal */}
        {selectedLeave && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Approve/Reject Leave</h2>
              <div className="mb-6">
                <p className="text-gray-700 mb-2">
                  <strong>Student:</strong> {selectedLeave.studentId?.name}
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Dates:</strong> {new Date(selectedLeave.startDate).toLocaleDateString()} -{' '}
                  {new Date(selectedLeave.endDate).toLocaleDateString()}
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Reason:</strong> {selectedLeave.reason}
                </p>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Approval Notes
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows="4"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Add comments..."
                ></textarea>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleApprove}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" /> Approve
                </button>
                <button
                  onClick={handleReject}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" /> Reject
                </button>
                <button
                  onClick={() => {
                    setSelectedLeave(null);
                    setApprovalNotes('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Approved & Rejected */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Approved Leaves</h3>
            {approvedLeaves.length === 0 ? (
              <p className="text-gray-600">No approved leaves</p>
            ) : (
              <ul className="space-y-2">
                {approvedLeaves.map((leave) => (
                  <li key={leave._id} className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">{leave.studentId?.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Rejected Leaves</h3>
            {rejectedLeaves.length === 0 ? (
              <p className="text-gray-600">No rejected leaves</p>
            ) : (
              <ul className="space-y-2">
                {rejectedLeaves.map((leave) => (
                  <li key={leave._id} className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="text-gray-700">{leave.studentId?.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveApproval;

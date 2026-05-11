import React, { useState, useEffect } from 'react';
import api from '../../api';
import { AlertCircle, CheckCircle, Clock, Calendar, MapPin, FileText, Loader } from 'lucide-react';

const LeaveRequest = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    classId: '',
    leaveType: 'medical',
    reason: '',
    startDate: '',
    endDate: '',
  });
  const [enrolledClasses, setEnrolledClasses] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState({ balance: 0, totalUsed: 0, maxAllowed: 30 });

  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchMyClasses(),
        fetchLeaves(),
        fetchLeaveBalance()
      ]);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyClasses = async () => {
    try {
      const response = await api.get('/classes/my-classes');
      setEnrolledClasses(response.data.data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchLeaves = async () => {
    try {
      const response = await api.get('/leave/my-leaves');
      setLeaves(response.data.data || []);
    } catch (error) {
      console.error('Error fetching leaves:', error);
    }
  };

  const fetchLeaveBalance = async () => {
    try {
      const response = await api.get(`/leave/balance/${userId}`);
      setLeaveBalance(response.data.data);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculateDays = () => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      return days > 0 ? days : 0;
    }
    return 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const days = calculateDays();
    if (days > leaveBalance.balance) {
      setError(`Insufficient leave balance. You have ${leaveBalance.balance} days remaining.`);
      return;
    }

    if (days <= 0) {
      setError('Invalid date range');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/leave/request', formData);
      setSuccess('Leave request submitted successfully!');
      setFormData({ classId: '', leaveType: 'medical', reason: '', startDate: '', endDate: '' });
      setShowForm(false);
      await Promise.all([fetchLeaves(), fetchLeaveBalance()]);
    } catch (error) {
      setError(error.response?.data?.message || 'Error submitting leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border border-red-300';
      default:
        return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
    }
  };

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
            Leave Management
          </h1>
          <p className="text-gray-600 text-lg">Request and track your leave from classes</p>
        </div>

        {/* Leave Balance Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-8 border-t-4 border-blue-500">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            Leave Balance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
              <p className="text-gray-600 text-sm font-semibold mb-2 uppercase">Total Allowed</p>
              <p className="text-4xl font-bold text-blue-600">{leaveBalance.maxAllowed}</p>
              <p className="text-xs text-gray-500 mt-2">Academic Year</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
              <p className="text-gray-600 text-sm font-semibold mb-2 uppercase">Used</p>
              <p className="text-4xl font-bold text-orange-600">{leaveBalance.totalUsed}</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${(leaveBalance.totalUsed / leaveBalance.maxAllowed) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
              <p className="text-gray-600 text-sm font-semibold mb-2 uppercase">Remaining</p>
              <p className="text-4xl font-bold text-green-600">{leaveBalance.balance}</p>
              <p className="text-xs text-gray-500 mt-2">Available to use</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mb-8 flex gap-3">
          <button
            onClick={() => { setShowForm(!showForm); setError(''); setSuccess(''); }}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition font-semibold flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            {showForm ? 'Cancel Request' : 'New Leave Request'}
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

        {/* Leave Request Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-8 border-l-4 border-indigo-500">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Request Leave</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Class Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Class *</label>
                  <select
                    name="classId"
                    value={formData.classId}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                  >
                    <option value="">Select a class</option>
                    {enrolledClasses.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.classId} - {c.subject}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Leave Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Leave Type *</label>
                  <select
                    name="leaveType"
                    value={formData.leaveType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                  >
                    {Object.entries(leaveTypeLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Start Date */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date *</label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">End Date *</label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    required
                    min={formData.startDate || new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                  />
                </div>
              </div>

              {/* Days Preview */}
              {formData.startDate && formData.endDate && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Total Days:</span> {calculateDays()} days
                    {calculateDays() > leaveBalance.balance && (
                      <span className="text-red-600 ml-2">⚠️ Exceeds available balance</span>
                    )}
                  </p>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Reason *</label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  required
                  rows="4"
                  maxLength="500"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition resize-none"
                  placeholder="Provide a reason for your leave request..."
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">{formData.reason.length}/500 characters</p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Submit Request
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Leave Requests List */}
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            Your Leave Requests
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 text-indigo-600 animate-spin" />
              <span className="ml-3 text-gray-600">Loading...</span>
            </div>
          ) : leaves.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No leave requests yet</p>
              <p className="text-gray-500">Submit your first leave request to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-4 px-4 font-bold text-gray-700">Class</th>
                    <th className="text-left py-4 px-4 font-bold text-gray-700">Type</th>
                    <th className="text-left py-4 px-4 font-bold text-gray-700">Date Range</th>
                    <th className="text-left py-4 px-4 font-bold text-gray-700">Days</th>
                    <th className="text-left py-4 px-4 font-bold text-gray-700">Status</th>
                    <th className="text-left py-4 px-4 font-bold text-gray-700">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((leave) => (
                    <tr key={leave._id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                      <td className="py-4 px-4 text-gray-700 font-medium">
                        {leave.class?.classId} <br />
                        <span className="text-xs text-gray-500">{leave.class?.subject}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                          {leaveTypeLabels[leave.leaveType] || leave.leaveType}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-700">
                        {new Date(leave.startDate).toLocaleDateString('en-IN')} to{' '}
                        {new Date(leave.endDate).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-4 px-4 text-gray-700 font-semibold text-center">
                        {leave.numberOfDays}
                      </td>
                      <td className="py-4 px-4">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadgeColor(leave.status)}`}>
                          {getStatusIcon(leave.status)}
                          <span className="capitalize">{leave.status}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-xs text-gray-600 max-w-xs">
                        {leave.approvalNotes || leave.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaveRequest;

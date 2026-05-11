import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, Shield, Eye } from 'lucide-react';

const AuditLogViewer = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [expandedLog, setExpandedLog] = useState(null);

  useEffect(() => {
    fetchAuditLogs();
  }, [filterAction, filterEntity]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterAction) params.append('action', filterAction);
      if (filterEntity) params.append('entityType', filterEntity);

      const response = await axios.get(`http://localhost:5000/api/audit-log?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setLogs(response.data.data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  const getActionIcon = (action) => {
    const icons = {
      CREATE: '+',
      UPDATE: '📝',
      DELETE: '🗑️',
      LOGIN: '🔓',
      LOGOUT: '🔒',
      APPROVE_LEAVE: '✓',
      SEND_EMAIL: '📧',
    };
    return icons[action] || '•';
  };

  const uniqueActions = [...new Set(logs.map((l) => l.action))];
  const uniqueEntities = [...new Set(logs.map((l) => l.entityType))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800">Audit Trail</h1>
          <p className="text-gray-600 mt-2">System activity log and compliance tracking</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">All Actions</option>
                {uniqueActions.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Entity Type</label>
              <select
                value={filterEntity}
                onChange={(e) => setFilterEntity(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">All Types</option>
                {uniqueEntities.map((entity) => (
                  <option key={entity} value={entity}>
                    {entity}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Audit Log List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <Eye className="w-5 h-5" /> Activity Log
          </h2>
          {loading ? (
            <p className="text-gray-600">Loading logs...</p>
          ) : logs.length === 0 ? (
            <p className="text-gray-600">No audit logs found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">User</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Action</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Entity</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Time</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Severity</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <React.Fragment key={log._id}>
                      <tr className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-4 px-4 text-gray-700 font-medium">
                          {log.userId?.name || 'System'}
                        </td>
                        <td className="py-4 px-4 text-gray-700">
                          <span className="flex items-center gap-2">
                            <span>{getActionIcon(log.action)}</span>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-700">{log.entityType}</td>
                        <td className="py-4 px-4 text-gray-600 text-sm">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${getSeverityColor(log.severity)}`}
                          >
                            {getSeverityIcon(log.severity)}
                            {log.severity}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() =>
                              setExpandedLog(expandedLog === log._id ? null : log._id)
                            }
                            className="text-indigo-600 hover:text-indigo-800 font-semibold text-sm"
                          >
                            {expandedLog === log._id ? 'Hide' : 'Details'}
                          </button>
                        </td>
                      </tr>
                      {expandedLog === log._id && (
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <td colSpan="6" className="py-4 px-4">
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm font-semibold text-gray-700 mb-1">
                                  IP Address
                                </p>
                                <p className="text-gray-600 font-mono text-sm">
                                  {log.ipAddress || 'N/A'}
                                </p>
                              </div>
                              {log.oldValues && Object.keys(log.oldValues).length > 0 && (
                                <div>
                                  <p className="text-sm font-semibold text-gray-700 mb-1">
                                    Previous Values
                                  </p>
                                  <pre className="bg-white p-2 rounded border border-gray-300 text-xs overflow-auto max-h-40">
                                    {JSON.stringify(log.oldValues, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.newValues && Object.keys(log.newValues).length > 0 && (
                                <div>
                                  <p className="text-sm font-semibold text-gray-700 mb-1">
                                    New Values
                                  </p>
                                  <pre className="bg-white p-2 rounded border border-gray-300 text-xs overflow-auto max-h-40">
                                    {JSON.stringify(log.newValues, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.errorMessage && (
                                <div>
                                  <p className="text-sm font-semibold text-red-700 mb-1">
                                    Error
                                  </p>
                                  <p className="text-red-600 text-sm">{log.errorMessage}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <p className="text-gray-600 text-sm">Total Logs</p>
            <p className="text-3xl font-bold text-indigo-600 mt-2">{logs.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <p className="text-gray-600 text-sm">Critical Events</p>
            <p className="text-3xl font-bold text-red-600 mt-2">
              {logs.filter((l) => l.severity === 'critical').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <p className="text-gray-600 text-sm">Today</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {logs.filter((l) => {
                const logDate = new Date(l.createdAt);
                const today = new Date();
                return logDate.toDateString() === today.toDateString();
              }).length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogViewer;

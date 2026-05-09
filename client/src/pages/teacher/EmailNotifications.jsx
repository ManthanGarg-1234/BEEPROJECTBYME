import { useState, useEffect } from 'react';
import api from '../../api';

const EmailNotifications = () => {
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [defaulters, setDefaulters] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sendingId, setSendingId] = useState(null); // track per-student sending
    const [bulkSending, setBulkSending] = useState(false);
    const [teacherInfo, setTeacherInfo] = useState(null);
    const [classInfo, setClassInfo] = useState(null);

    // History
    const [showHistory, setShowHistory] = useState(false);
    const [emailHistory, setEmailHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [expandedLog, setExpandedLog] = useState(null);
    const [logDetail, setLogDetail] = useState(null);

    // Result popup
    const [showResult, setShowResult] = useState(false);
    const [resultData, setResultData] = useState(null);

    // Messages
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 5000);
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: msg, type, duration: 5000 } }));
    };

    // Fetch classes
    useEffect(() => {
        (async () => {
            try {
                const res = await api.get('/classes');
                setClasses(res.data);
                if (res.data.length > 0) setSelectedClass(res.data[0]._id);
            } catch (err) { console.error(err); }
        })();
    }, []);

    // Fetch defaulters when class changes
    useEffect(() => {
        if (selectedClass) fetchDefaulters();
    }, [selectedClass]);

    const fetchDefaulters = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/email/defaulters/${selectedClass}`);
            setDefaulters(res.data.students || []);
            setTeacherInfo(res.data.teacher || null);
            setClassInfo(res.data.class || null);
        } catch (err) {
            console.error(err);
            showToast('Failed to fetch defaulters', 'error');
        } finally { setLoading(false); }
    };

    // Send to ONE student
    const handleSendSingle = async (student) => {
        if (!window.confirm(`Send attendance warning to ${student.name}?`)) return;
        setSendingId(student._id);
        try {
            const res = await api.post(`/email/send-single/${selectedClass}/${student._id}`);
            showToast(`✅ Email sent to ${student.name}`);
            setResultData({ selected: 1, sent: 1, failed: 0 });
            setShowResult(true);
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to send';
            showToast(`❌ ${msg}`, 'error');
            setResultData({ selected: 1, sent: 0, failed: 1 });
            setShowResult(true);
        } finally { setSendingId(null); }
    };

    // Send to ALL defaulters
    const handleSendAll = async () => {
        if (defaulters.length === 0) return;
        if (!window.confirm(`Send attendance warning to ALL ${defaulters.length} defaulter(s)?`)) return;
        setBulkSending(true);
        try {
            const res = await api.post(`/email/send-all-defaulters/${selectedClass}`);
            const r = res.data.result;
            showToast(`✅ ${r.success} sent, ${r.failed} failed, ${r.skipped} skipped`);
            setResultData({ selected: r.total, sent: r.success, failed: r.failed, skipped: r.skipped });
            setShowResult(true);
            fetchDefaulters();
            setTimeout(() => fetchEmailHistory(), 500);
        } catch (err) {
            showToast(err.response?.data?.message || 'Bulk send failed', 'error');
            setResultData({ selected: defaulters.length, sent: 0, failed: defaulters.length });
            setShowResult(true);
        } finally { setBulkSending(false); }
    };

    // Retry failed
    const handleRetry = async (batchId) => {
        try {
            const res = await api.post(`/email/retry/${batchId}`);
            showToast(`🔄 Retry: ${res.data.retrySuccess} sent, ${res.data.retryFail} failed`);
            fetchEmailHistory();
        } catch (err) {
            showToast('Retry failed', 'error');
        }
    };

    // History
    const fetchEmailHistory = async () => {
        if (!selectedClass) return;
        setHistoryLoading(true);
        try {
            const res = await api.get(`/email/history?classId=${selectedClass}&limit=20`);
            setEmailHistory(res.data.logs || []);
            setShowHistory(true);
        } catch (err) { showToast('Failed to fetch history', 'error'); }
        finally { setHistoryLoading(false); }
    };

    const fetchLogDetail = async (batchId) => {
        if (expandedLog === batchId) { setExpandedLog(null); setLogDetail(null); return; }
        try {
            const res = await api.get(`/email/log/${batchId}`);
            setLogDetail(res.data);
            setExpandedLog(batchId);
        } catch (err) { showToast('Failed to fetch log', 'error'); }
    };

    // Attendance badge color
    const attColor = (att) => {
        if (att < 50) return { bg: 'rgba(239,68,68,0.15)', text: '#f87171', border: 'rgba(239,68,68,0.3)' };
        if (att < 65) return { bg: 'rgba(249,115,22,0.15)', text: '#fb923c', border: 'rgba(249,115,22,0.3)' };
        return { bg: 'rgba(245,158,11,0.15)', text: '#fbbf24', border: 'rgba(245,158,11,0.3)' };
    };

    const selectedClassData = classes.find(c => c._id === selectedClass);

    return (
        <div className="page-container">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', boxShadow: '0 8px 24px rgba(245,158,11,0.25)' }}>
                        <span className="text-white text-lg">⚠️</span>
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                            Low Attendance Alerts
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Detect defaulters &amp; send attendance warnings</p>
                    </div>
                </div>
                {/* Bulk Send Button */}
                {defaulters.length > 0 && !loading && (
                    <button onClick={handleSendAll} disabled={bulkSending}
                        className="px-6 py-3 rounded-xl font-bold text-white transition-all disabled:opacity-50 active:scale-[0.97]"
                        style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 8px 24px rgba(239,68,68,0.3)' }}>
                        {bulkSending ? '📤 Sending...' : `📤 Send To All Defaulters (${defaulters.length})`}
                    </button>
                )}
            </div>

            {/* Toast */}
            {toast && (
                <div className={`mb-4 p-4 rounded-xl flex items-center gap-2 text-sm font-semibold ${toast.type === 'error' ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-green-500/10 border border-green-500/30 text-green-400'}`}>
                    {toast.msg}
                </div>
            )}

            {/* Result Popup */}
            {showResult && resultData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setShowResult(false)}>
                    <div className="relative w-full max-w-md mx-4 rounded-2xl overflow-hidden shadow-2xl"
                        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', border: '1px solid rgba(148,163,184,0.2)', animation: 'popupIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
                        onClick={e => e.stopPropagation()}>
                        <div className="h-1.5 w-full" style={{ background: resultData.failed === 0 ? 'linear-gradient(90deg, #22c55e, #16a34a)' : resultData.sent === 0 ? 'linear-gradient(90deg, #ef4444, #dc2626)' : 'linear-gradient(90deg, #f59e0b, #f97316)' }} />
                        <div className="flex flex-col items-center pt-8 pb-2">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-4"
                                style={{ background: resultData.failed === 0 ? 'rgba(34,197,94,0.15)' : resultData.sent === 0 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)' }}>
                                {resultData.failed === 0 ? '✅' : resultData.sent === 0 ? '❌' : '⚠️'}
                            </div>
                            <h2 className="text-xl font-bold text-white mb-1">
                                {resultData.failed === 0 ? 'Emails Sent!' : resultData.sent === 0 ? 'Sending Failed' : 'Partially Sent'}
                            </h2>
                            <p className="text-sm text-slate-400 mb-6">
                                {resultData.failed === 0 ? 'All emails delivered successfully.' : resultData.sent === 0 ? 'Check SMTP settings.' : 'Some emails could not be delivered.'}
                            </p>
                        </div>
                        <div className="grid grid-cols-3 gap-3 px-6 pb-6">
                            <div className="flex flex-col items-center p-3 rounded-xl" style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' }}>
                                <span className="text-2xl font-extrabold text-blue-400">{resultData.selected}</span>
                                <span className="text-xs text-slate-400 mt-1 font-semibold">Selected</span>
                            </div>
                            <div className="flex flex-col items-center p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                                <span className="text-2xl font-extrabold text-green-400">{resultData.sent}</span>
                                <span className="text-xs text-slate-400 mt-1 font-semibold">Sent</span>
                            </div>
                            <div className="flex flex-col items-center p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <span className="text-2xl font-extrabold text-red-400">{resultData.failed}</span>
                                <span className="text-xs text-slate-400 mt-1 font-semibold">Failed</span>
                            </div>
                        </div>
                        <div className="px-6 pb-6">
                            <button onClick={() => setShowResult(false)} className="w-full py-3 rounded-xl font-bold text-white transition-all"
                                style={{ background: resultData.failed === 0 ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Class Selector */}
                    <div className="glass-card-solid p-6 rounded-2xl">
                        <h3 className="text-lg font-bold text-white mb-4">Select Class</h3>
                        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 outline-none transition-all">
                            <option value="">Choose a class...</option>
                            {classes.map(cls => (
                                <option key={cls._id} value={cls._id}>{cls.classId} — {cls.subject}</option>
                            ))}
                        </select>
                    </div>

                    {/* Defaulters Table */}
                    {selectedClass && (
                        <div className="glass-card-solid p-6 rounded-2xl">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h3 className="text-lg font-bold text-white">Defaulters — Below 75%</h3>
                                    <p className="text-xs text-slate-400 mt-1">Students with attendance below the required threshold</p>
                                </div>
                                <span className="px-4 py-1.5 rounded-full text-sm font-bold"
                                    style={{ background: defaulters.length > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)', color: defaulters.length > 0 ? '#f87171' : '#4ade80', border: `1px solid ${defaulters.length > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}` }}>
                                    {loading ? '...' : `${defaulters.length} defaulter${defaulters.length !== 1 ? 's' : ''}`}
                                </span>
                            </div>

                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <div className="w-8 h-8 border-4 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin"></div>
                                </div>
                            ) : defaulters.length === 0 ? (
                                <div className="py-12 text-center">
                                    <div className="text-4xl mb-3">🎉</div>
                                    <p className="text-slate-300 font-semibold">All students have good attendance!</p>
                                    <p className="text-slate-500 text-sm mt-1">No defaulters found in this class</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left border-b border-slate-700/50">
                                                <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Student</th>
                                                <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Roll No</th>
                                                <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Attendance</th>
                                                <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Institutional Email</th>
                                                <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {defaulters.map((s, i) => {
                                                const colors = attColor(s.attendance);
                                                return (
                                                    <tr key={s._id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                                        <td className="py-3.5">
                                                            <p className="font-semibold text-white">{s.name}</p>
                                                        </td>
                                                        <td className="py-3.5">
                                                            <span className="font-mono text-slate-300 text-xs">{s.rollNumber}</span>
                                                        </td>
                                                        <td className="py-3.5">
                                                            <span className="px-3 py-1 rounded-full text-xs font-bold"
                                                                style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
                                                                {s.attendance}%
                                                            </span>
                                                            <span className="text-slate-500 text-xs ml-2">({s.classesAttended}/{s.totalClasses})</span>
                                                        </td>
                                                        <td className="py-3.5">
                                                            <span className="text-xs text-cyan-300/80 font-mono">{s.institutionalEmail}</span>
                                                        </td>
                                                        <td className="py-3.5 text-right">
                                                            <button onClick={() => handleSendSingle(s)}
                                                                disabled={sendingId === s._id || bulkSending}
                                                                className="px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-40 active:scale-95"
                                                                style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', boxShadow: '0 4px 12px rgba(102,126,234,0.25)' }}>
                                                                {sendingId === s._id ? '⏳...' : '📧 Send'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* History Section */}
                    {showHistory && (
                        <div className="glass-card-solid p-6 rounded-2xl">
                            <h3 className="text-lg font-bold text-white mb-4">📋 Notification History</h3>
                            {emailHistory.length === 0 ? (
                                <p className="text-sm text-slate-400">No emails sent yet for this class</p>
                            ) : (
                                <div className="space-y-3">
                                    {emailHistory.map(log => (
                                        <div key={log._id} className="rounded-xl bg-slate-800/50 border border-slate-700/50 overflow-hidden">
                                            <div className="p-4 cursor-pointer hover:bg-slate-800/70 transition-colors" onClick={() => fetchLogDetail(log.batchId)}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-sm font-bold text-white truncate flex-1">{log.subject}</p>
                                                    <span className="text-xs text-slate-400 ml-3 shrink-0">
                                                        {log.sentAt ? new Date(log.sentAt).toLocaleString() : 'Pending'}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                                                    <span className="px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-300">{log.totalRecipients} total</span>
                                                    <span className="px-2.5 py-1 rounded-md bg-green-500/20 text-green-300">{log.successCount} sent</span>
                                                    {log.failureCount > 0 && (
                                                        <span className="px-2.5 py-1 rounded-md bg-red-500/20 text-red-300">{log.failureCount} failed</span>
                                                    )}
                                                    {log.template === 'low-attendance-warning' && (
                                                        <span className="px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300">Auto Template</span>
                                                    )}
                                                </div>
                                                {/* Retry button for failed batches */}
                                                {log.failureCount > 0 && (
                                                    <button onClick={e => { e.stopPropagation(); handleRetry(log.batchId); }}
                                                        className="mt-2 px-3 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-all">
                                                        🔄 Retry Failed
                                                    </button>
                                                )}
                                            </div>
                                            {/* Expanded detail */}
                                            {expandedLog === log.batchId && logDetail && (
                                                <div className="border-t border-slate-700/50 p-4 bg-slate-900/30">
                                                    <p className="text-xs font-bold text-slate-300 mb-2 uppercase">Recipients</p>
                                                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                                        {logDetail.recipients.map((r, i) => (
                                                            <div key={i} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-slate-800/40">
                                                                <span className="text-slate-200 font-medium">{r.name}</span>
                                                                <span className="text-slate-400 font-mono">{r.email}</span>
                                                                {r.attendance != null && <span className="text-slate-400">{r.attendance}%</span>}
                                                                <span className={`px-2 py-0.5 rounded-full font-bold ${r.status === 'sent' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                                                                    {r.status}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Class Info */}
                    {classInfo && (
                        <div className="glass-card-solid p-6 rounded-2xl">
                            <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Class Info</h4>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs text-slate-500">Class ID</p>
                                    <p className="text-sm font-bold text-cyan-300">{classInfo.classId}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">Subject</p>
                                    <p className="text-sm font-bold text-cyan-300">{classInfo.subject}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Teacher Info */}
                    {teacherInfo && (
                        <div className="glass-card-solid p-6 rounded-2xl">
                            <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Teacher</h4>
                            <div className="space-y-2">
                                <p className="text-sm font-bold text-white">{teacherInfo.name}</p>
                                <p className="text-xs text-cyan-300/80 font-mono">{teacherInfo.institutionalEmail}</p>
                            </div>
                        </div>
                    )}

                    {/* History Button */}
                    <button onClick={fetchEmailHistory} disabled={!selectedClass || historyLoading}
                        className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-200 font-semibold hover:border-slate-600 hover:text-white disabled:opacity-50 transition-all">
                        {historyLoading ? '⏳ Loading...' : '📋 Email History'}
                    </button>

                    {/* Stats */}
                    {defaulters.length > 0 && (
                        <div className="glass-card-solid p-6 rounded-2xl">
                            <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Quick Stats</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Defaulters</span>
                                    <span className="font-bold text-red-400">{defaulters.length}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Lowest</span>
                                    <span className="font-bold text-red-400">{defaulters.length > 0 ? `${defaulters[0].attendance}%` : '-'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Highest</span>
                                    <span className="font-bold text-amber-400">{defaulters.length > 0 ? `${defaulters[defaulters.length - 1].attendance}%` : '-'}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tips */}
                    <div className="glass-card-solid p-4 rounded-2xl">
                        <h4 className="text-xs font-bold text-slate-300 mb-2 uppercase">💡 Tips</h4>
                        <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                            <li>Click &quot;Send&quot; to email one student</li>
                            <li>&quot;Send To All&quot; emails every defaulter</li>
                            <li>Duplicate emails blocked for 24 hours</li>
                            <li>Retry failed sends from history</li>
                            <li>Institutional emails are auto-generated</li>
                        </ul>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes popupIn {
                    0% { opacity: 0; transform: scale(0.85) translateY(20px); }
                    100% { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default EmailNotifications;

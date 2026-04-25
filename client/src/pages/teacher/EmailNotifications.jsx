import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const EmailNotifications = () => {
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [lowAttendanceStudents, setLowAttendanceStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedStudents, setSelectedStudents] = useState(new Set());
    const [emailSubject, setEmailSubject] = useState('Attendance Warning - Low Attendance');
    const [emailBody, setEmailBody] = useState('Dear {studentName},\n\nWe are writing to inform you that your attendance in {className} ({classId}) is currently below 75%.\n\nCurrent Status:\n- Attendance Percentage: {attendance}%\n\nPlease improve your attendance immediately to meet the academic requirements.\n\nBest regards,\nAcademic Department');
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    const [emailHistory, setEmailHistory] = useState([]);
    const [sendingEmails, setSendingEmails] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [historyLoading, setHistoryLoading] = useState(false);

    // Fetch classes on component load
    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const res = await api.get('/classes');
                setClasses(res.data);
                if (res.data.length > 0) {
                    setSelectedClass(res.data[0]._id);
                }
            } catch (err) {
                console.error('Error fetching classes:', err);
            }
        };
        fetchClasses();
    }, []);

    // Fetch low-attendance students when class changes
    useEffect(() => {
        if (selectedClass) {
            fetchLowAttendanceStudents();
        }
    }, [selectedClass]);

    // Auto-clear messages after 5 seconds
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    useEffect(() => {
        if (errorMessage) {
            const timer = setTimeout(() => setErrorMessage(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [errorMessage]);

    const fetchLowAttendanceStudents = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/email/low-attendance/${selectedClass}?threshold=75`);
            setLowAttendanceStudents(res.data.students || []);
            setSelectedStudents(new Set()); // Clear selection when changing class
        } catch (err) {
            console.error('Error fetching low-attendance students:', err);
            setErrorMessage('Failed to fetch low-attendance students');
        } finally {
            setLoading(false);
        }
    };

    const handleStudentToggle = (studentId) => {
        const newSet = new Set(selectedStudents);
        if (newSet.has(studentId)) {
            newSet.delete(studentId);
        } else {
            newSet.add(studentId);
        }
        setSelectedStudents(newSet);
    };

    const handleSelectAll = () => {
        if (selectedStudents.size === lowAttendanceStudents.length) {
            setSelectedStudents(new Set());
        } else {
            setSelectedStudents(new Set(lowAttendanceStudents.map(s => s._id)));
        }
    };

    const handlePreview = async () => {
        if (selectedStudents.size === 0) {
            setErrorMessage('Please select at least one student');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/email/preview', {
                classId: selectedClass,
                studentIds: Array.from(selectedStudents),
                subject: emailSubject,
                body: emailBody
            });
            setPreviewData(res.data);
            setShowPreview(true);
        } catch (err) {
            console.error('Error previewing email:', err);
            setErrorMessage('Failed to preview email');
        } finally {
            setLoading(false);
        }
    };

    const handleSendEmails = async () => {
        if (!window.confirm(`Send email to ${selectedStudents.size} student(s)?`)) {
            return;
        }

        setSendingEmails(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const res = await api.post('/email/send', {
                classId: selectedClass,
                studentIds: Array.from(selectedStudents),
                subject: emailSubject,
                body: emailBody,
                template: 'attendance-warning'
            });

            const successMsg = `Emails sent successfully! (${res.data.results.success} sent, ${res.data.results.failed} failed)`;
            setSuccessMessage(successMsg);
            
            // Show toast notification
            window.dispatchEvent(new CustomEvent('show-toast', {
                detail: {
                    message: successMsg,
                    type: 'success',
                    duration: 5000
                }
            }));

            setSelectedStudents(new Set());
            setShowPreview(false);
            fetchLowAttendanceStudents(); // Refresh the list
            
            // Automatically fetch and display email history
            setTimeout(() => {
                fetchEmailHistory();
            }, 500);
        } catch (err) {
            console.error('Error sending emails:', err);
            const errorMsg = err.response?.data?.message || 'Failed to send emails';
            setErrorMessage(errorMsg);
            
            // Show error toast notification
            window.dispatchEvent(new CustomEvent('show-toast', {
                detail: {
                    message: errorMsg,
                    type: 'error',
                    duration: 5000
                }
            }));
        } finally {
            setSendingEmails(false);
        }
    };

    const fetchEmailHistory = async () => {
        if (!selectedClass) return;
        
        setHistoryLoading(true);
        try {
            const res = await api.get(`/email/history?classId=${selectedClass}&limit=20`);
            setEmailHistory(res.data.logs || []);
            setShowHistory(true);
        } catch (err) {
            console.error('Error fetching email history:', err);
            setErrorMessage('Failed to fetch email history');
        } finally {
            setHistoryLoading(false);
        }
    };

    const selectedClass_data = classes.find(c => c._id === selectedClass);

    return (
        <div className="page-container">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <span className="text-white text-lg">✉️</span>
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 bg-clip-text text-transparent">
                            Email Notifications
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Send attendance warnings to students</p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            {successMessage && (
                <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 flex items-center gap-2">
                    <span>✓</span> {successMessage}
                </div>
            )}
            {errorMessage && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
                    <span>⚠️</span> {errorMessage}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Class Selector */}
                    <div className="glass-card-solid p-6 rounded-2xl">
                        <h3 className="text-lg font-bold text-white mb-4">Select Class</h3>
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 outline-none transition-all"
                        >
                            <option value="">Choose a class...</option>
                            {classes.map(cls => (
                                <option key={cls._id} value={cls._id}>
                                    {cls.classId} — {cls.subject}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Low Attendance Students */}
                    {selectedClass && !showPreview && (
                        <div className="glass-card-solid p-6 rounded-2xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-white">Students with Low Attendance (&lt;75%)</h3>
                                <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-sm font-semibold">
                                    {lowAttendanceStudents.length} students
                                </span>
                            </div>

                            {loading ? (
                                <div className="flex justify-center items-center py-8">
                                    <div className="w-8 h-8 border-4 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin"></div>
                                </div>
                            ) : lowAttendanceStudents.length === 0 ? (
                                <div className="py-8 text-center text-slate-400">
                                    <p>🎉 All students have good attendance!</p>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedStudents.size === lowAttendanceStudents.length}
                                                onChange={handleSelectAll}
                                                className="w-4 h-4 rounded cursor-pointer"
                                            />
                                            <span className="text-sm font-semibold text-white">
                                                Select All ({selectedStudents.size}/{lowAttendanceStudents.length})
                                            </span>
                                        </label>
                                    </div>

                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {lowAttendanceStudents.map(student => (
                                            <label
                                                key={student._id}
                                                className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 cursor-pointer transition-all"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedStudents.has(student._id)}
                                                    onChange={() => handleStudentToggle(student._id)}
                                                    className="w-4 h-4 rounded cursor-pointer"
                                                />
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-white">{student.name}</p>
                                                    <p className="text-xs text-slate-400">{student.rollNumber}</p>
                                                </div>
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                    student.attendance >= 65 ? 'bg-orange-500/20 text-orange-300' : 'bg-red-500/20 text-red-300'
                                                }`}>
                                                    {student.attendance}%
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Email Compose */}
                    {selectedClass && !showPreview && (
                        <div className="glass-card-solid p-6 rounded-2xl">
                            <h3 className="text-lg font-bold text-white mb-4">Compose Email</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">Subject</label>
                                    <input
                                        type="text"
                                        value={emailSubject}
                                        onChange={(e) => setEmailSubject(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 outline-none transition-all"
                                        placeholder="Email subject..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">Message</label>
                                    <textarea
                                        value={emailBody}
                                        onChange={(e) => setEmailBody(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 outline-none transition-all resize-none"
                                        placeholder="Email message..."
                                        rows={8}
                                    />
                                    <p className="text-xs text-slate-400 mt-2">
                                        Available placeholders: {'{studentName}'}, {'{className}'}, {'{classId}'}
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={handlePreview}
                                        disabled={loading || selectedStudents.size === 0}
                                        className="flex-1 px-6 py-3 rounded-xl bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 font-semibold hover:bg-cyan-500/30 disabled:opacity-50 transition-all"
                                    >
                                        👁️ Preview ({selectedStudents.size})
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Preview */}
                    {showPreview && previewData && (
                        <div className="glass-card-solid p-6 rounded-2xl">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-white">Email Preview</h3>
                                <button
                                    onClick={() => setShowPreview(false)}
                                    className="text-sm px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:text-white transition-all"
                                >
                                    ✕ Back
                                </button>
                            </div>

                            <div className="space-y-4 bg-slate-900/40 border border-slate-700/50 rounded-xl p-4 mb-4">
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">To:</p>
                                    <p className="text-sm font-semibold text-white">
                                        {previewData.recipientCount} student{previewData.recipientCount !== 1 ? 's' : ''}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Subject:</p>
                                    <p className="text-sm font-semibold text-white">{previewData.subject}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Preview (first student):</p>
                                    <div className="text-sm text-slate-300 whitespace-pre-wrap bg-slate-800/30 p-3 rounded-lg">
                                        {previewData.preview}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleSendEmails}
                                disabled={sendingEmails}
                                className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold shadow-lg shadow-green-500/20 hover:shadow-green-500/30 disabled:opacity-50 transition-all"
                            >
                                {sendingEmails ? '📤 Sending...' : '📤 Send to All'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Class Info */}
                    {selectedClass_data && (
                        <div className="glass-card-solid p-6 rounded-2xl">
                            <h4 className="text-sm font-bold text-slate-300 mb-3">CLASS INFO</h4>
                            <div className="space-y-2">
                                <div>
                                    <p className="text-xs text-slate-400">ID</p>
                                    <p className="text-sm font-bold text-cyan-300">{selectedClass_data.classId}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">Subject</p>
                                    <p className="text-sm font-bold text-cyan-300">{selectedClass_data.subject}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Email History Button */}
                    <button
                        onClick={fetchEmailHistory}
                        disabled={!selectedClass || historyLoading}
                        className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-200 font-semibold hover:border-slate-600 hover:text-white disabled:opacity-50 transition-all"
                    >
                        📋 Email History
                    </button>

                    {/* History Display */}
                    {showHistory && (
                        <div className="glass-card-solid p-6 rounded-2xl max-h-96 overflow-y-auto">
                            <h4 className="text-sm font-bold text-slate-300 mb-3">RECENT SENDS</h4>
                            {emailHistory.length === 0 ? (
                                <p className="text-xs text-slate-400">No emails sent yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {emailHistory.map(log => (
                                        <div key={log._id} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                                            <p className="text-xs font-bold text-white mb-1">{log.subject}</p>
                                            <p className="text-xs text-slate-400">
                                                {log.sentAt ? new Date(log.sentAt).toLocaleDateString() : 'Pending'}
                                            </p>
                                            <div className="flex gap-2 mt-2 text-xs">
                                                <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-300">
                                                    ✓ {log.successCount}
                                                </span>
                                                {log.failureCount > 0 && (
                                                    <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300">
                                                        ✗ {log.failureCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Help */}
                    <div className="glass-card-solid p-4 rounded-2xl">
                        <h4 className="text-xs font-bold text-slate-300 mb-2 uppercase">💡 Tips</h4>
                        <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                            <li>Use placeholders to personalize emails</li>
                            <li>Preview before sending</li>
                            <li>Emails won't send twice in 24h</li>
                            <li>Check history for send status</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmailNotifications;

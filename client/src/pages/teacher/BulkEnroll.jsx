import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';

const BulkEnroll = () => {
    const { classId } = useParams();
    const [classInfo, setClassInfo] = useState(null);
    const [studentsData, setStudentsData] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchClass();
    }, [classId]);

    const fetchClass = async () => {
        try {
            const res = await api.get(`/classes/${classId}`);
            setClassInfo(res.data);
        } catch (err) {
            setError('Class not found');
        }
    };

    const handleEnroll = async () => {
        if (!studentsData.trim()) return setError('Please enter student data');
        setError('');
        setResult(null);
        setLoading(true);
        try {
            const res = await api.post(`/classes/${classId}/bulk-enroll`, { studentsData });
            setResult(res.data);
            setStudentsData('');
        } catch (err) {
            setError(err.response?.data?.message || 'Enrollment failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container">
            <button onClick={() => navigate('/teacher/classes')} className="flex items-center text-gray-500 dark:text-gray-400 hover:text-primary-500 mb-6 transition-colors">
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Classes
            </button>

            <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                    📝
                </div>
                <div>
                    <h1 className="section-title text-3xl">Bulk Enrollment</h1>
                    {classInfo && <p className="text-gray-500 dark:text-gray-400">{classInfo.classId} - {classInfo.subject}</p>}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input */}
                <div className="glass-card-solid p-6">
                    <h3 className="font-semibold dark:text-white mb-2">Student Data</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Enter roll number and name, one per line. Supported formats:
                    </p>
                    <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-3 mb-4 text-sm font-mono text-gray-600 dark:text-gray-300">
                        <p>2401020101 - Rahul Kumar</p>
                        <p>2401020102,Priya Sharma</p>
                        <p>2401020103 Amit Singh</p>
                    </div>

                    {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

                    <textarea
                        id="bulk-enroll-textarea"
                        value={studentsData}
                        onChange={(e) => setStudentsData(e.target.value)}
                        className="input-field min-h-[300px] font-mono text-sm resize-y"
                        placeholder="Paste student data here..."
                    />

                    <div className="mt-4 flex gap-3">
                        <button onClick={handleEnroll} disabled={loading} className="btn-primary flex-1">
                            {loading ? 'Processing...' : '🚀 Enroll Students'}
                        </button>
                    </div>
                </div>

                {/* Results */}
                <div>
                    {result && (
                        <div className="glass-card-solid p-6">
                            <h3 className="font-semibold dark:text-white mb-4">Enrollment Results</h3>

                            {/* Summary */}
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <div className="bg-blue-500/10 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-blue-500">{result.summary.totalProcessed}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Processed</p>
                                </div>
                                <div className="bg-green-500/10 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-green-500">{result.summary.newAccountsCreated}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">New Accounts</p>
                                </div>
                                <div className="bg-primary-500/10 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-primary-500">{result.summary.newlyEnrolled}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Enrolled</p>
                                </div>
                                <div className="bg-red-500/10 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-red-500">{result.summary.errors}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Errors</p>
                                </div>
                            </div>

                            {/* New Accounts with credentials */}
                            {result.details.created.length > 0 && (
                                <div className="mb-4">
                                    <h4 className="text-sm font-medium text-green-500 mb-2">✅ New Accounts Created</h4>
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                        {result.details.created.map((s, i) => (
                                            <div key={i} className="bg-gray-50 dark:bg-dark-700 rounded-lg p-3 text-sm">
                                                <p className="dark:text-white font-medium">{s.name} ({s.rollNumber})</p>
                                                <p className="text-gray-500 dark:text-gray-400 text-xs">{s.email}</p>
                                                <p className="text-xs mt-1">
                                                    Temp password: <code className="bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded">{s.tempPassword}</code>
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Errors */}
                            {result.details.errors.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-medium text-red-500 mb-2">❌ Errors</h4>
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                        {result.details.errors.map((e, i) => (
                                            <div key={i} className="bg-red-500/5 rounded-lg p-3 text-sm">
                                                <p className="text-red-400 font-mono text-xs">{e.line}</p>
                                                <p className="text-red-300 text-xs mt-1">{e.reason}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Current Students */}
                    {classInfo?.students?.length > 0 && (
                        <div className="glass-card-solid p-6 mt-6">
                            <h3 className="font-semibold dark:text-white mb-3">Enrolled Students ({classInfo.students.length})</h3>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {classInfo.students.map(s => (
                                    <div key={s._id} className="flex items-center justify-between bg-gray-50 dark:bg-dark-700 rounded-lg p-3">
                                        <div>
                                            <p className="dark:text-white text-sm font-medium">{s.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{s.rollNumber}</p>
                                        </div>
                                        <span className="text-xs text-gray-400">{s.email}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BulkEnroll;

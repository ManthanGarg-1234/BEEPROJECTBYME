import { useState, useEffect } from 'react';
import api from '../../api';

const EvaluationPanel = () => {
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchClasses = async () => {
            const res = await api.get('/classes');
            setClasses(res.data);
            if (res.data.length > 0) setSelectedClass(res.data[0].classId);
        };
        fetchClasses();
    }, []);

    const runEvaluation = async () => {
        setLoading(true);
        setResult(null);
        try {
            const res = await api.post(`/analytics/evaluate/${selectedClass}`);
            setResult(res.data);
        } catch (err) {
            alert(err.response?.data?.message || 'Evaluation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container animate-fade-in">
            <h1 className="section-title text-3xl mb-2">Attendance Evaluation</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
                Run evaluation to check attendance levels and send warning emails (activates after 40% semester)
            </p>

            <div className="max-w-2xl mx-auto">
                <div className="glass-card-solid p-6 mb-8">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="input-field flex-1">
                            {classes.map(c => <option key={c._id} value={c.classId}>{c.classId} - {c.subject}</option>)}
                        </select>
                        <button onClick={runEvaluation} disabled={loading} className="btn-primary whitespace-nowrap">
                            {loading ? '⏳ Evaluating...' : '🔍 Run Evaluation'}
                        </button>
                    </div>
                </div>

                {result && (
                    <div className="animate-slide-up">
                        {result.skipped ? (
                            <div className="glass-card-solid p-6 text-center">
                                <span className="text-4xl block mb-3">⏳</span>
                                <p className="dark:text-white font-medium">{result.message}</p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    <div className="stat-card text-center">
                                        <p className="text-2xl font-bold dark:text-white">{result.totalStudents}</p>
                                        <p className="text-xs text-gray-500">Total</p>
                                    </div>
                                    <div className="stat-card text-center">
                                        <p className="text-2xl font-bold text-yellow-500">
                                            {result.results?.filter(r => r.warningLevel === 'Warning').length}
                                        </p>
                                        <p className="text-xs text-gray-500">Warning</p>
                                    </div>
                                    <div className="stat-card text-center">
                                        <p className="text-2xl font-bold text-red-500">
                                            {result.results?.filter(r => r.warningLevel === 'Critical').length}
                                        </p>
                                        <p className="text-xs text-gray-500">Critical</p>
                                    </div>
                                </div>

                                <div className="glass-card-solid p-6">
                                    <h3 className="font-semibold dark:text-white mb-4">Student Results</h3>
                                    <div className="space-y-3">
                                        {result.results?.map((r, i) => (
                                            <div key={i} className={`flex items-center justify-between p-4 rounded-xl border ${r.warningLevel === 'Critical' ? 'border-red-500/30 bg-red-500/5' :
                                                    r.warningLevel === 'Warning' ? 'border-yellow-500/30 bg-yellow-500/5' :
                                                        'border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700'
                                                }`}>
                                                <div>
                                                    <p className="dark:text-white font-medium">{r.name}</p>
                                                    <p className="text-xs text-gray-500">{r.rollNumber} • {r.email}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`font-bold ${r.percentage >= 75 ? 'text-green-500' : r.percentage >= 65 ? 'text-yellow-500' : 'text-red-500'
                                                        }`}>{r.percentage}%</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {r.warningLevel && (
                                                            <span className={`text-xs px-2 py-0.5 rounded-full ${r.warningLevel === 'Critical' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'
                                                                }`}>{r.warningLevel}</span>
                                                        )}
                                                        {r.emailSent && <span className="text-xs text-green-500">📧 Sent</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EvaluationPanel;

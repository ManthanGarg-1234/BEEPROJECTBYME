import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const ClassManagement = () => {
    const [classes, setClasses] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ classId: '', subject: '', semesterStartDate: '', semesterEndDate: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => { fetchClasses(); }, []);

    const fetchClasses = async () => {
        try {
            const res = await api.get('/classes');
            setClasses(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.post('/classes', form);
            setForm({ classId: '', subject: '', semesterStartDate: '', semesterEndDate: '' });
            setShowForm(false);
            fetchClasses();
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed to create class');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this class?')) return;
        try {
            await api.delete(`/classes/${id}`);
            fetchClasses();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete');
        }
    };

    return (
        <div className="page-container animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="section-title text-3xl">Class Management</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Create and manage your classes</p>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="btn-primary">
                    {showForm ? '✕ Cancel' : '+ New Class'}
                </button>
            </div>

            {/* Create Form */}
            {showForm && (
                <div className="glass-card-solid p-6 mb-8 animate-slide-up">
                    <h3 className="font-semibold dark:text-white mb-4">Create New Class</h3>
                    {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

                    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Class ID</label>
                            <input value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}
                                className="input-field" placeholder="e.g., DSA001" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Subject</label>
                            <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                                className="input-field" placeholder="Data Structures & Algorithms" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Semester Start</label>
                            <input type="date" value={form.semesterStartDate} onChange={(e) => setForm({ ...form, semesterStartDate: e.target.value })}
                                className="input-field" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Semester End</label>
                            <input type="date" value={form.semesterEndDate} onChange={(e) => setForm({ ...form, semesterEndDate: e.target.value })}
                                className="input-field" required />
                        </div>
                        <div className="md:col-span-2">
                            <button type="submit" disabled={loading} className="btn-primary">
                                {loading ? 'Creating...' : 'Create Class'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Class List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classes.map(cls => (
                    <div key={cls._id} className="glass-card-solid p-6 hover:shadow-xl transition-all duration-300 group">
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                {cls.classId.substring(0, 2)}
                            </div>
                            <button onClick={() => handleDelete(cls._id)}
                                className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-all">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>

                        <h3 className="font-bold text-lg dark:text-white">{cls.classId}</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">{cls.subject}</p>

                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-gray-500 dark:text-gray-400">
                                <span>Students</span>
                                <span className="font-medium dark:text-white">{cls.students?.length || 0}</span>
                            </div>
                            <div className="flex justify-between text-gray-500 dark:text-gray-400">
                                <span>Semester</span>
                                <span className="font-medium dark:text-white text-xs">
                                    {new Date(cls.semesterStartDate).toLocaleDateString()} - {new Date(cls.semesterEndDate).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="flex justify-between text-gray-500 dark:text-gray-400">
                                <span>Progress</span>
                                <span className="font-medium dark:text-white">{cls.semesterProgress}%</span>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-dark-700">
                            <button onClick={() => navigate(`/teacher/classes/${cls._id}/enroll`)}
                                className="w-full btn-secondary text-sm py-2">
                                📝 Bulk Enroll Students
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {classes.length === 0 && !showForm && (
                <div className="glass-card-solid p-12 text-center">
                    <span className="text-5xl block mb-4">📚</span>
                    <p className="text-gray-500 dark:text-gray-400">No classes created yet. Click "New Class" to begin.</p>
                </div>
            )}
        </div>
    );
};

export default ClassManagement;

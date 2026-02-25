import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const ClassManagement = () => {
    const [classes, setClasses] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ classId: '', subject: '', semesterStartDate: '' });
    const today = new Date().toISOString().split('T')[0];
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => { fetchClasses(); }, []);

    const fetchClasses = async () => {
        try { const res = await api.get('/classes'); setClasses(res.data); }
        catch (err) { console.error(err); }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.post('/classes', form);
            setForm({ classId: '', subject: '', semesterStartDate: '' });
            setShowForm(false);
            fetchClasses();
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed to create class');
        } finally { setLoading(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this class?')) return;
        try { await api.delete(`/classes/${id}`); fetchClasses(); }
        catch (err) { alert(err.response?.data?.message || 'Failed to delete'); }
    };

    const cardColors = [
        { gradient: 'from-blue-500 to-cyan-400', light: 'from-blue-50 to-cyan-50', shadow: 'shadow-blue-500/15' },
        { gradient: 'from-violet-500 to-purple-400', light: 'from-violet-50 to-purple-50', shadow: 'shadow-violet-500/15' },
        { gradient: 'from-emerald-500 to-teal-400', light: 'from-emerald-50 to-teal-50', shadow: 'shadow-emerald-500/15' },
        { gradient: 'from-rose-500 to-pink-400', light: 'from-rose-50 to-pink-50', shadow: 'shadow-rose-500/15' },
        { gradient: 'from-amber-500 to-orange-400', light: 'from-amber-50 to-orange-50', shadow: 'shadow-amber-500/15' },
        { gradient: 'from-indigo-500 to-blue-400', light: 'from-indigo-50 to-blue-50', shadow: 'shadow-indigo-500/15' },
    ];

    return (
        <div className="page-container animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                        <span className="text-white text-lg">📚</span>
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
                            Class Management
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Create and manage your classes</p>
                    </div>
                </div>
                <button onClick={() => setShowForm(!showForm)}
                    className={`px-6 py-3 rounded-xl font-bold text-sm shadow-md ${showForm
                        ? 'bg-gray-200 dark:bg-dark-600 text-gray-700 dark:text-gray-200'
                        : 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/30'
                        }`}>
                    {showForm ? '✕ Cancel' : '✨ New Class'}
                </button>
            </div>

            {/* Create Form */}
            {showForm && (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-500 to-purple-400 p-[1px] mb-8 animate-slide-up">
                    <div className="bg-white dark:bg-dark-800 rounded-[15px] p-6 relative overflow-hidden">
                        <h3 className="font-bold dark:text-white mb-4 flex items-center gap-2 relative">
                            <span className="w-8 h-8 rounded-lg bg-gradient-to-r from-violet-500 to-purple-400 flex items-center justify-center text-white text-sm">📝</span>
                            Create New Class
                        </h3>
                        {error && (
                            <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-900/20 dark:to-red-900/20 border border-rose-200 dark:border-rose-800/30 text-rose-600 dark:text-rose-400 text-sm font-medium flex items-center gap-2">
                                <span>⚠️</span> {error}
                            </div>
                        )}
                        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Class ID</label>
                                <input value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-dark-700 border-2 border-gray-200 dark:border-dark-600 text-gray-800 dark:text-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all" placeholder="e.g., DSA001" required />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Subject</label>
                                <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-dark-700 border-2 border-gray-200 dark:border-dark-600 text-gray-800 dark:text-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all" placeholder="Data Structures & Algorithms" required />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Class Commencement Date</label>
                                <input type="date" value={form.semesterStartDate} min={today} onChange={(e) => setForm({ ...form, semesterStartDate: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-dark-700 border-2 border-gray-200 dark:border-dark-600 text-gray-800 dark:text-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all" required />
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Date from which this subject's classes are conducted. Attendance tracking ends 6 months later.</p>
                            </div>
                            <div className="md:col-span-2">
                                <button type="submit" disabled={loading}
                                    className="bg-gradient-to-r from-violet-500 to-purple-500 text-white px-8 py-3 rounded-xl font-bold shadow-md shadow-purple-500/20 disabled:opacity-50">
                                    {loading ? 'Creating...' : '🚀 Create Class'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Class Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
                {classes.map((cls, idx) => {
                    const colors = cardColors[idx % cardColors.length];
                    return (
                        <div key={cls._id} className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${colors.gradient} p-[1px] ${colors.shadow} shadow-lg group`}>
                            <div className="bg-white dark:bg-dark-800 rounded-[15px] h-full relative overflow-hidden">
                                {/* Color header strip */}
                                <div className={`bg-gradient-to-r ${colors.gradient} px-6 py-4`}>
                                    <div className="flex items-start justify-between">
                                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                                            {cls.classId.substring(0, 2)}
                                        </div>
                                        <button onClick={() => handleDelete(cls._id)}
                                            className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/20 transition-all">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <h3 className="font-bold text-lg dark:text-white">{cls.classId}</h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{cls.subject}</p>

                                    <div className="space-y-2.5 text-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">👥 Students</span>
                                            <span className="font-bold dark:text-white bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-0.5 rounded-lg text-indigo-600 dark:text-indigo-400">{cls.students?.length || 0}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">📅 Semester</span>
                                            <span className="font-medium dark:text-white text-xs">
                                                {new Date(cls.semesterStartDate).toLocaleDateString()} – {new Date(cls.semesterEndDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5 text-sm">📊 Semester Progress</span>
                                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{cls.semesterProgress}%</span>
                                            </div>
                                            <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-dark-600 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-700"
                                                    style={{ width: `${cls.semesterProgress}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-5 pt-4 border-t border-gray-100 dark:border-dark-700">
                                        <button onClick={() => navigate(`/teacher/classes/${cls._id}/enroll`)}
                                            className={`w-full py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r ${colors.light} dark:bg-dark-700 border-2 border-transparent`}
                                            style={{ borderImageSlice: 1 }}>
                                            📝 Bulk Enroll Students
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {classes.length === 0 && !showForm && (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-500 to-purple-400 p-[1px]">
                    <div className="bg-white dark:bg-dark-800 rounded-[15px] p-16 text-center relative overflow-hidden">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <span className="text-4xl">📚</span>
                        </div>
                        <h3 className="text-xl font-bold dark:text-white mb-2 relative">No classes created yet</h3>
                        <p className="text-gray-500 dark:text-gray-400 relative">Click "New Class" to begin.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClassManagement;

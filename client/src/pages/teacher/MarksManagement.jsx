import { useState, useEffect } from 'react';
import api from '../../api';

const MarksManagement = () => {
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedClassData, setSelectedClassData] = useState(null);
    const [students, setStudents] = useState([]);
    const [marks, setMarks] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [stats, setStats] = useState(null);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        fetchClasses();
    }, []);

    useEffect(() => {
        if (selectedClass) {
            fetchStudentsAndMarks(selectedClass);
            fetchStats(selectedClass);
        }
    }, [selectedClass]);

    const fetchClasses = async () => {
        try {
            const res = await api.get('/classes');
            setClasses(res.data);
            if (res.data.length > 0) {
                setSelectedClass(res.data[0]._id);
            }
        } catch (err) {
            showToast('error', 'Failed to load classes');
            console.error(err);
        }
    };

    const fetchStudentsAndMarks = async (classId) => {
        setLoading(true);
        try {
            const [classRes, marksRes] = await Promise.all([
                api.get(`/classes/${classId}`),
                api.get(`/marks/class/${classId}`)
            ]);

            const classData = classRes.data;
            const marksData = marksRes.data;

            setSelectedClassData(classData);

            const marksMap = {};
            marksData.forEach(m => {
                marksMap[m.student._id] = m;
            });

            setStudents(classData.students || []);
            setMarks(marksMap);
        } catch (err) {
            showToast('error', 'Failed to load marks');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async (classId) => {
        try {
            const res = await api.get(`/marks/stats/${classId}`);
            setStats(res.data);
        } catch (err) {
            console.error('Failed to load stats:', err);
        }
    };

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    };

    const handleMarkChange = (studentId, component, value) => {
        const current = marks[studentId] || {
            student: { _id: studentId },
            quiz: { obtained: 0 },
            midterm: { obtained: 0 },
            assignment: { obtained: 0 },
            practical: { obtained: null },
            project: { obtained: null }
        };

        const updated = { ...current };
        const numValue = parseFloat(value) || 0;
        updated[component].obtained = numValue < 0 ? 0 : numValue;

        setMarks(prev => ({
            ...prev,
            [studentId]: updated
        }));
    };

    const saveMarks = async (studentId) => {
        setSaving(true);
        try {
            const marksData = marks[studentId];
            await api.post('/marks', {
                studentId,
                classId: selectedClass,
                quiz: marksData.quiz?.obtained || 0,
                midterm: marksData.midterm?.obtained || 0,
                assignment: marksData.assignment?.obtained || 0,
                practical: marksData.practical?.obtained || null,
                project: marksData.project?.obtained || null
            });
            showToast('success', 'Marks saved successfully');
            await fetchStudentsAndMarks(selectedClass);
            await fetchStats(selectedClass);
        } catch (err) {
            showToast('error', err.response?.data?.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const calculateGrade = (total, maxTotal) => {
        if (maxTotal === 0) return 'NA';
        const pct = (total / maxTotal) * 100;
        if (pct >= 90) return 'A';
        if (pct >= 80) return 'B';
        if (pct >= 70) return 'C';
        if (pct >= 60) return 'D';
        if (pct > 0) return 'F';
        return 'NA';
    };

    const getGradeColor = (grade) => {
        switch (grade) {
            case 'A':
                return 'bg-green-500/20 text-green-400';
            case 'B':
                return 'bg-blue-500/20 text-blue-400';
            case 'C':
                return 'bg-yellow-500/20 text-yellow-400';
            case 'D':
                return 'bg-orange-500/20 text-orange-400';
            case 'F':
                return 'bg-red-500/20 text-red-400';
            default:
                return 'bg-gray-500/20 text-gray-400';
        }
    };

    return (
        <div className="page-container">
            {toast && (
                <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg text-sm font-semibold ${
                    toast.type === 'success' 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                    {toast.msg}
                </div>
            )}

            <h1 className="section-title text-3xl mb-2">Marks Management</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
                Enter and manage student marks/grades for this semester
            </p>

            {/* Class Selector */}
            <div className="glass-card-solid p-6 mb-8">
                <label className="block text-sm font-medium text-gray-300 mb-2">Select Class</label>
                <select 
                    value={selectedClass} 
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="input-field max-w-md"
                >
                    <option value="">-- Choose a class --</option>
                    {classes.map(c => (
                        <option key={c._id} value={c._id}>
                            {c.classId} — {c.subject}
                        </option>
                    ))}
                </select>
            </div>

            {selectedClass && selectedClassData && (
                <>
                    {/* Stats */}
                    {stats && (
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
                            <div className="glass-card-solid p-4">
                                <p className="text-2xl font-bold">{stats.totalStudents}</p>
                                <p className="text-xs text-gray-400 mt-1">Total Students</p>
                            </div>
                            <div className="glass-card-solid p-4">
                                <p className="text-2xl font-bold text-cyan-400">{stats.marksEntered}</p>
                                <p className="text-xs text-gray-400 mt-1">Marks Entered</p>
                            </div>
                            <div className="glass-card-solid p-4">
                                <p className="text-2xl font-bold text-green-400">{stats.avgPercentage.toFixed(1)}%</p>
                                <p className="text-xs text-gray-400 mt-1">Average %</p>
                            </div>
                            <div className="glass-card-solid p-4">
                                <div className="flex gap-1 text-xs font-bold">
                                    {Object.entries(stats.gradeDistribution).map(([grade, count]) => (
                                        <span key={grade} className={`px-1.5 py-0.5 rounded ${
                                            grade === 'A' ? 'bg-green-500/10 text-green-400' :
                                            grade === 'B' ? 'bg-blue-500/10 text-blue-400' :
                                            grade === 'C' ? 'bg-yellow-500/10 text-yellow-400' :
                                            grade === 'D' ? 'bg-orange-500/10 text-orange-400' :
                                            grade === 'F' ? 'bg-red-500/10 text-red-400' :
                                            'bg-gray-500/10 text-gray-400'
                                        }`}>
                                            {grade}:{count}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Distribution</p>
                            </div>
                        </div>
                    )}

                    {/* Marks Table */}
                    {loading ? (
                        <div className="glass-card-solid p-12 text-center">
                            <p className="text-gray-400">Loading...</p>
                        </div>
                    ) : (
                        <div className="glass-card-solid p-6 overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-700">
                                        <th className="text-left py-3 px-2">Name</th>
                                        <th className="text-center py-3 px-2">Roll</th>
                                        <th className="text-center py-3 px-2" title="Quiz (max: 20)">Quiz/20</th>
                                        <th className="text-center py-3 px-2" title="Midterm (max: 30)">Mid/30</th>
                                        <th className="text-center py-3 px-2" title="Assignment (max: 10)">Assign/10</th>
                                        <th className="text-center py-3 px-2">Total/60</th>
                                        <th className="text-center py-3 px-2">%</th>
                                        <th className="text-center py-3 px-2">Grade</th>
                                        <th className="text-center py-3 px-2">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map(student => {
                                        const m = marks[student._id];
                                        const quiz = m?.quiz?.obtained || 0;
                                        const midterm = m?.midterm?.obtained || 0;
                                        const assignment = m?.assignment?.obtained || 0;
                                        const total = quiz + midterm + assignment;
                                        const maxTotal = 60;
                                        const pct = (total / maxTotal) * 100;
                                        const grade = calculateGrade(total, maxTotal);
                                        
                                        return (
                                            <tr key={student._id} className="border-b border-slate-700 hover:bg-slate-900/30 transition-colors">
                                                <td className="py-3 px-2 text-sm">{student.name}</td>
                                                <td className="text-center text-xs text-gray-400 px-2">{student.rollNumber}</td>
                                                <td className="text-center px-2">
                                                    <input 
                                                        type="number" 
                                                        min="0" 
                                                        max="20" 
                                                        value={quiz}
                                                        onChange={(e) => handleMarkChange(student._id, 'quiz', e.target.value)}
                                                        className="w-14 px-1 py-1 rounded bg-slate-800 border border-slate-700 text-center text-white text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50"
                                                    />
                                                </td>
                                                <td className="text-center px-2">
                                                    <input 
                                                        type="number" 
                                                        min="0" 
                                                        max="30" 
                                                        value={midterm}
                                                        onChange={(e) => handleMarkChange(student._id, 'midterm', e.target.value)}
                                                        className="w-14 px-1 py-1 rounded bg-slate-800 border border-slate-700 text-center text-white text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50"
                                                    />
                                                </td>
                                                <td className="text-center px-2">
                                                    <input 
                                                        type="number" 
                                                        min="0" 
                                                        max="10" 
                                                        value={assignment}
                                                        onChange={(e) => handleMarkChange(student._id, 'assignment', e.target.value)}
                                                        className="w-14 px-1 py-1 rounded bg-slate-800 border border-slate-700 text-center text-white text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50"
                                                    />
                                                </td>
                                                <td className="text-center font-bold text-cyan-200 px-2">{total}</td>
                                                <td className="text-center text-sm font-semibold px-2">
                                                    <span className={pct >= 0 ? 'text-white' : 'text-gray-500'}>
                                                        {pct.toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="text-center px-2">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${getGradeColor(grade)}`}>
                                                        {grade}
                                                    </span>
                                                </td>
                                                <td className="text-center px-2">
                                                    <button 
                                                        onClick={() => saveMarks(student._id)}
                                                        disabled={saving}
                                                        className="btn-primary text-xs py-1 px-3 whitespace-nowrap"
                                                    >
                                                        {saving ? '💾' : '💾 Save'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {students.length === 0 && (
                                <div className="text-center py-12 text-gray-400">
                                    No students enrolled in this class
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {!selectedClass && (
                <div className="glass-card-solid p-12 text-center">
                    <p className="text-gray-400">Select a class to manage marks</p>
                </div>
            )}
        </div>
    );
};

export default MarksManagement;

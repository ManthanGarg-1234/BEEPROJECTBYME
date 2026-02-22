import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
    const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'teacher' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (form.password !== form.confirmPassword) {
            return setError('Passwords do not match');
        }

        setLoading(true);
        try {
            const rollNumber = form.email.split('@')[0];
            const user = await register({
                name: form.name,
                email: form.email,
                password: form.password,
                role: form.role,
                rollNumber
            });
            navigate(user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard');
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data?.errors?.map(e => e.msg).join(', ') || 'Registration failed';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-900 via-dark-800 to-primary-900 px-4 py-8">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-500/20 rounded-full blur-3xl"></div>
            </div>

            <div className="relative w-full max-w-md">
                <div className="text-center mb-8 animate-fade-in">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-primary-500 to-accent-500 mb-4 shadow-lg shadow-primary-500/30">
                        <span className="text-3xl">📋</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white">Create Account</h1>
                    <p className="text-gray-400 mt-2">Join AttendEase today</p>
                </div>

                <div className="bg-dark-800/80 backdrop-blur-xl rounded-2xl border border-dark-600/50 p-8 shadow-2xl animate-slide-up">
                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name</label>
                            <input id="reg-name" name="name" value={form.name} onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl bg-dark-700 border border-dark-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none transition-all"
                                placeholder="John Doe" required />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                            <input id="reg-email" name="email" type="email" value={form.email} onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl bg-dark-700 border border-dark-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none transition-all"
                                placeholder="rollnumber@abcuniversity.edu" required />
                            <p className="text-xs text-gray-500 mt-1">Format: 10-digit roll number @ college domain</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Role</label>
                            <select id="reg-role" name="role" value={form.role} onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl bg-dark-700 border border-dark-600 text-white focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none transition-all">
                                <option value="teacher">Teacher</option>
                                <option value="student">Student</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
                            <input id="reg-password" name="password" type="password" value={form.password} onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl bg-dark-700 border border-dark-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none transition-all"
                                placeholder="Min 8 chars, 1 upper, 1 lower, 1 num, 1 special" required />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm Password</label>
                            <input id="reg-confirm" name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl bg-dark-700 border border-dark-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none transition-all"
                                placeholder="Repeat your password" required />
                        </div>

                        <button id="reg-submit" type="submit" disabled={loading} className="w-full btn-primary py-3.5 text-base mt-2">
                            {loading ? 'Creating account...' : 'Create Account'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-400 text-sm">
                            Already have an account?{' '}
                            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">Sign In</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;

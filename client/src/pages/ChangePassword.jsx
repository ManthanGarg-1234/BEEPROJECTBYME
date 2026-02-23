import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const ChangePassword = () => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (newPassword !== confirmPassword) {
            return setError('Passwords do not match');
        }
        setLoading(true);
        try {
            await api.post('/auth/change-password', { currentPassword, newPassword });
            alert('Password changed successfully! Please login again.');
            logout();
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="relative w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-cyan-500 to-lime-400 mb-4 shadow-lg shadow-cyan-500/25">
                        <span className="text-3xl">🔑</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Change Password</h1>
                    {user?.firstLogin && (
                        <p className="text-cyan-200 mt-2 text-sm">New access, new credential. Set your permanent key.</p>
                    )}
                </div>

                <div className="glass-card-solid p-8">
                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-400/30 text-rose-200 text-sm">{error}</div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-200 mb-2">Current Password</label>
                            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                                className="input-field"
                                placeholder="Enter current password" required />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-200 mb-2">New Password</label>
                            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                                className="input-field"
                                placeholder="Min 8 chars, 1 upper, 1 lower, 1 num, 1 special" required />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-200 mb-2">Confirm New Password</label>
                            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                className="input-field"
                                placeholder="Repeat new password" required />
                        </div>

                        <button type="submit" disabled={loading} className="w-full btn-primary py-3.5">
                            {loading ? 'Changing...' : 'Change Password'}
                        </button>
                    </form>
                </div>

                <div className="mt-6 glass-card p-4 text-left">
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/80 mb-2">Next up</p>
                    <p className="text-white text-sm font-semibold">You land in your personalized dashboard</p>
                    <p className="text-white/60 text-xs mt-2">Analytics, sessions, and real-time alerts await.</p>
                </div>
            </div>
        </div>
    );
};

export default ChangePassword;

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
    const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'student' });
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { setError('Photo must be less than 5MB'); return; }
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Only JPEG, PNG, or WebP allowed'); return; }
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.password !== form.confirmPassword) return setError('Passwords do not match');
        setError('');
        setLoading(true);
        try {
            const { confirmPassword, ...data } = form;
            await register(data, photoFile);
            navigate('/login');
        } catch (err) {
            if (!err.response) {
                setError('Cannot connect to server. Make sure the backend is running.');
            } else {
                const data = err.response.data;
                const msg = data?.message || data?.error || (data?.errors && data.errors[0]?.msg) || 'Registration error. Please try again.';
                setError(msg);
            }
        } finally { setLoading(false); }
    };

    const particles = Array.from({ length: 15 }, (_, i) => ({
        id: i, size: Math.random() * 6 + 2, left: Math.random() * 100,
        delay: Math.random() * 10, duration: Math.random() * 15 + 10,
    }));

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Illustration Panel */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 items-center justify-center overflow-hidden">
                <img
                    src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=80"
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-20"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/15 via-transparent to-lime-500/10"></div>
                <div className="absolute top-10 left-10 w-72 h-72 bg-cyan-400/10 rounded-full"></div>
                <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-400/10 rounded-full"></div>
                <div className="absolute top-1/2 right-1/4 w-48 h-48 bg-lime-400/10 rounded-full"></div>

                {particles.map(p => (
                    <div key={p.id} className="particle"
                        style={{ width: `${p.size}px`, height: `${p.size}px`, left: `${p.left}%`, bottom: '-10px', background: 'rgba(255,255,255,0.4)', animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` }}
                    />
                ))}

                <div className="relative z-10 text-center px-12">
                    <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-80 mx-auto mb-8">
                        <circle cx="200" cy="140" r="70" fill="white" opacity="0.1" />
                        <circle cx="200" cy="120" r="22" fill="white" opacity="0.25" />
                        <circle cx="200" cy="112" r="10" fill="white" opacity="0.4" />
                        <path d="M183 132c0-9 8-17 17-17s17 8 17 17" stroke="white" strokeWidth="2.5" fill="none" opacity="0.4" />
                        <circle cx="120" cy="160" r="18" fill="white" opacity="0.15" />
                        <circle cx="120" cy="153" r="8" fill="white" opacity="0.3" />
                        <path d="M107 168c0-7 6-13 13-13s13 6 13 13" stroke="white" strokeWidth="2" fill="none" opacity="0.3" />
                        <circle cx="280" cy="160" r="18" fill="white" opacity="0.15" />
                        <circle cx="280" cy="153" r="8" fill="white" opacity="0.3" />
                        <path d="M267 168c0-7 6-13 13-13s13 6 13 13" stroke="white" strokeWidth="2" fill="none" opacity="0.3" />
                        <path d="M145 155L175 130" stroke="white" strokeWidth="1.5" opacity="0.2" strokeDasharray="4 4" />
                        <path d="M255 155L225 130" stroke="white" strokeWidth="1.5" opacity="0.2" strokeDasharray="4 4" />
                        <path d="M190 220c0 0 10-5 10-15v-12l-10-5-10 5v12c0 10 10 15 10 15z" transform="translate(10,0)" fill="white" opacity="0.2" />
                        <path d="M197 202l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                        <circle cx="320" cy="80" r="3" fill="#fbbf24" opacity="0.8" />
                        <circle cx="80" cy="100" r="4" fill="#fbbf24" opacity="0.6" />
                        <circle cx="340" cy="200" r="2" fill="white" opacity="0.6" />
                        <circle cx="60" cy="220" r="3" fill="white" opacity="0.4" />
                    </svg>

                    <h2 className="text-3xl font-extrabold text-white mb-3">Join AttendEase</h2>
                    <p className="text-white/70 text-lg max-w-md mx-auto">Build your classroom signal and unlock live analytics.</p>

                    <div className="mt-10 flex flex-col gap-3 max-w-xs mx-auto">
                        {[{ icon: '🎓', text: 'Student & Teacher accounts' }, { icon: '📱', text: 'Scan from any device' }, { icon: '📈', text: 'Trendline analytics' }].map((f, i) => (
                            <div key={i} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3 text-white/90 text-sm font-medium">
                                <span className="text-lg">{f.icon}</span>{f.text}
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 glass-card p-4 text-left max-w-xs mx-auto">
                        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/80 mb-2">Next up</p>
                        <p className="text-white text-sm font-semibold">Instant class creation and QR sessions</p>
                        <p className="text-white/60 text-xs mt-2">See it in the next screen.</p>
                    </div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center relative overflow-hidden">
                <div className="w-full max-w-md mx-auto px-8 py-6 relative z-10">
                    {/* Mobile logo */}
                    <div className="lg:hidden text-center mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-lime-400 flex items-center justify-center mx-auto shadow-xl shadow-cyan-500/25 mb-4">
                            <span className="text-white text-2xl font-bold">A</span>
                        </div>
                        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-cyan-400 via-blue-400 to-lime-400 bg-clip-text text-transparent">AttendEase</h1>
                    </div>

                    <div className="text-center lg:text-left mb-5">
                        <h2 className="text-3xl font-extrabold text-white mb-2">Create Account</h2>
                        <p className="text-slate-300">Fill in your details to get started</p>
                    </div>

                    {error && (
                        <div className="mb-4 p-4 rounded-xl bg-rose-500/10 border border-rose-400/30 text-rose-200 text-sm font-medium flex items-center gap-2 animate-slide-down">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <div className="glass-card-solid p-6">
                        <form onSubmit={handleSubmit} className="space-y-3.5">
                            {/* Role Toggle */}
                            <div className="flex gap-2 p-1.5 bg-slate-900/60 border border-slate-700/60 rounded-xl">
                                {[{ value: 'teacher', label: '👨‍🏫 Teacher', gradient: 'from-cyan-500 to-blue-500' }, { value: 'student', label: '🎓 Student', gradient: 'from-lime-500 to-emerald-500' }].map(r => (
                                    <button key={r.value} type="button" onClick={() => setForm({ ...form, role: r.value })}
                                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${form.role === r.value ? `bg-gradient-to-r ${r.gradient} text-white shadow-md` : 'text-slate-400 hover:text-slate-200'}`}>
                                        {r.label}
                                    </button>
                                ))}
                            </div>

                            {/* Photo Upload - Student only */}
                            {form.role === 'student' && (
                                <div className="flex flex-col items-center gap-3">
                                    <label htmlFor="photo-upload" className="cursor-pointer group">
                                        <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-dashed border-slate-600 hover:border-cyan-300 transition-all duration-300 group-hover:scale-105">
                                            {photoPreview ? (
                                                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-cyan-900/30 to-lime-900/30 flex flex-col items-center justify-center">
                                                    <svg className="w-8 h-8 text-cyan-300 group-hover:text-cyan-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                </div>
                                            )}
                                            {/* Overlay on hover */}
                                            {photoPreview && (
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                    </label>
                                    <input id="photo-upload" type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="hidden" />
                                    <p className="text-xs text-slate-400">{photoFile ? photoFile.name : 'Upload your photo (max 5MB)'}</p>
                                </div>
                            )}

                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <svg className="w-5 h-5 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <input type="text" required placeholder="Full Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field pl-12 pr-4" />
                            </div>

                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <svg className="w-5 h-5 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <input type="email" required placeholder="Email Address" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-field pl-12 pr-4" />
                            </div>

                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <svg className="w-5 h-5 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <input type={showPassword ? 'text' : 'password'} required placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                                    className="input-field pl-12 pr-12" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-cyan-300 transition-colors">
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    )}
                                </button>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <svg className="w-5 h-5 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                </div>
                                <input type="password" required placeholder="Confirm Password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} className="input-field pl-12 pr-4" />
                            </div>

                            <button type="submit" disabled={loading}
                                className="w-full btn-primary py-3.5 hover:scale-[1.02] disabled:hover:scale-100">
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                                        Creating account...
                                    </span>
                                ) : 'Create Account'}
                            </button>
                        </form>
                    </div>

                    <p className="text-center mt-5 text-slate-400 text-sm">
                        Already have an account?{' '}
                        <Link to="/login" className="font-semibold text-cyan-300 hover:text-lime-300 transition-colors">Sign in →</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;

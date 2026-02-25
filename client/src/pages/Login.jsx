import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await login(email, password);
            if (res.firstLogin) {
                navigate('/change-password');
            } else {
                navigate(res.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard');
            }
        } catch (err) {
            if (!err.response) {
                setError('Cannot connect to server. Make sure the backend is running.');
            } else {
                const data = err.response.data;
                setError(data?.message || (data?.errors && data.errors[0]?.msg) || 'Invalid credentials');
            }
        } finally {
            setLoading(false);
        }
    };

    const particles = Array.from({ length: 15 }, (_, i) => ({
        id: i,
        size: Math.random() * 6 + 2,
        left: Math.random() * 100,
        delay: Math.random() * 10,
        duration: Math.random() * 15 + 10,
        opacity: Math.random() * 0.3 + 0.1,
    }));

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Illustration Panel */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 items-center justify-center overflow-hidden">
                <video
                    src="https://assets.mixkit.co/videos/preview/mixkit-working-on-a-laptop-in-an-office-environment-3246-large.mp4"
                    autoPlay
                    loop
                    muted
                    className="absolute inset-0 w-full h-full object-cover opacity-20"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-transparent to-lime-500/10"></div>
                {/* Animated background blobs */}
                <div className="absolute top-10 left-10 w-72 h-72 bg-cyan-400/10 rounded-full"></div>
                <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-400/10 rounded-full"></div>
                <div className="absolute top-1/2 left-1/4 w-48 h-48 bg-lime-400/10 rounded-full"></div>

                {/* Floating particles */}
                {particles.map(p => (
                    <div key={p.id} className="particle"
                        style={{
                            width: `${p.size}px`, height: `${p.size}px`,
                            left: `${p.left}%`, bottom: '-10px',
                            background: 'rgba(255,255,255,0.4)',
                            animationDelay: `${p.delay}s`,
                            animationDuration: `${p.duration}s`,
                        }}
                    />
                ))}

                {/* Content */}
                <div className="relative z-10 text-center px-12">
                    {/* SVG Illustration */}
                    <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-80 mx-auto mb-8">
                        {/* Clipboard */}
                        <rect x="130" y="30" width="140" height="200" rx="15" fill="white" opacity="0.15" />
                        <rect x="170" y="20" width="60" height="20" rx="10" fill="white" opacity="0.25" />
                        <rect x="155" y="65" width="90" height="6" rx="3" fill="white" opacity="0.4" />
                        <rect x="155" y="85" width="70" height="6" rx="3" fill="white" opacity="0.3" />
                        <rect x="155" y="105" width="80" height="6" rx="3" fill="white" opacity="0.4" />
                        {/* Checkmarks */}
                        <rect x="155" y="130" width="30" height="30" rx="6" fill="white" opacity="0.2" />
                        <path d="M163 145l5 5 10-10" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
                        <rect x="195" y="130" width="30" height="30" rx="6" fill="white" opacity="0.2" />
                        <path d="M203 145l5 5 10-10" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        <rect x="235" y="130" width="30" height="30" rx="6" fill="white" opacity="0.2" />
                        {/* QR Code */}
                        <rect x="155" y="175" width="25" height="25" rx="4" fill="white" opacity="0.2" />
                        <rect x="158" y="178" width="7" height="7" rx="1" fill="white" opacity="0.5" />
                        <rect x="168" y="178" width="7" height="7" rx="1" fill="white" opacity="0.5" />
                        <rect x="158" y="188" width="7" height="7" rx="1" fill="white" opacity="0.5" />
                        {/* People */}
                        <circle cx="320" cy="100" r="20" fill="white" opacity="0.15" />
                        <circle cx="320" cy="90" r="8" fill="white" opacity="0.3" />
                        <path d="M305 110c0-8 7-15 15-15s15 7 15 15" stroke="white" strokeWidth="2" fill="none" opacity="0.3" />
                        <circle cx="80" cy="160" r="20" fill="white" opacity="0.15" />
                        <circle cx="80" cy="150" r="8" fill="white" opacity="0.3" />
                        <path d="M65 170c0-8 7-15 15-15s15 7 15 15" stroke="white" strokeWidth="2" fill="none" opacity="0.3" />
                        {/* Stars */}
                        <circle cx="100" cy="60" r="3" fill="#fbbf24" opacity="0.8" />
                        <circle cx="310" cy="200" r="4" fill="#fbbf24" opacity="0.6" />
                        <circle cx="340" cy="60" r="2" fill="white" opacity="0.6" />
                    </svg>

                    <h2 className="text-3xl font-extrabold text-white mb-3">Welcome to AttendEase</h2>
                    <p className="text-white/70 text-lg max-w-md mx-auto">
                        Live attendance intelligence with instant QR verification and analytics.
                    </p>

                    {/* Feature highlights */}
                    <div className="mt-10 flex flex-col gap-3 max-w-xs mx-auto">
                        {[
                            { icon: '⚡', text: 'Instant QR scanning' },
                            { icon: '📡', text: 'Live session sync' },
                            { icon: '🧭', text: 'GPS proximity checks' },
                        ].map((f, i) => (
                            <div key={i} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3 text-white/90 text-sm font-medium">
                                <span className="text-lg">{f.icon}</span>
                                {f.text}
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 glass-card p-4 text-left max-w-xs mx-auto">
                        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/80 mb-2">Next up</p>
                        <p className="text-white text-sm font-semibold">Dynamic class heatmaps and auto warnings</p>
                        <p className="text-white/60 text-xs mt-2">Peek inside after login.</p>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center relative overflow-hidden">
                <div className="w-full max-w-md mx-auto px-8 relative z-10">
                    {/* Mobile logo */}
                    <div className="lg:hidden text-center mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-lime-400 flex items-center justify-center mx-auto shadow-xl shadow-cyan-500/25 mb-4">
                            <span className="text-white text-2xl font-bold">A</span>
                        </div>
                        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-cyan-400 via-blue-400 to-lime-400 bg-clip-text text-transparent">
                            AttendEase
                        </h1>
                    </div>

                    <div className="text-center lg:text-left mb-8">
                        <h2 className="text-3xl font-extrabold text-white mb-2">Welcome back!</h2>
                        <p className="text-slate-300">Sign in to continue the session flow</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-400/30 text-rose-200 text-sm font-medium flex items-center gap-2 animate-slide-down">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <div className="glass-card-solid p-7">
                        <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-slate-200 mb-2">Email Address</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <svg className="w-5 h-5 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="input-field pl-12 pr-4" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-200 mb-2">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <svg className="w-5 h-5 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <input id="password" type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="input-field pl-12 pr-12" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-cyan-300 transition-colors">
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <button id="login-btn" type="submit" disabled={loading}
                            className="w-full btn-primary py-3.5 hover:scale-[1.02] disabled:hover:scale-100">
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Signing in...
                                </span>
                            ) : 'Sign In'}
                        </button>
                    </form>
                    </div>

                    <p className="text-center mt-8 text-slate-400 text-sm">
                        Don't have an account?{' '}
                        <Link to="/register" className="font-semibold text-cyan-300 hover:text-lime-300 transition-colors">
                            Create one →
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;

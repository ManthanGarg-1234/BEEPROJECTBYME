import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useState } from 'react';

const Navbar = () => {
    const { user, logout, isTeacher, isStudent } = useAuth();
    const { darkMode, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const linkClass = ({ isActive }) =>
        `px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${isActive
            ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-600 dark:text-indigo-400'
            : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20'
        }`;

    const mobileLinkClass = ({ isActive }) =>
        `px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-3 ${isActive
            ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-600 dark:text-indigo-400 font-semibold'
            : 'text-gray-600 dark:text-gray-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10'
        }`;

    const teacherLinks = [
        { to: '/teacher/dashboard', label: '📊 Dashboard' },
        { to: '/teacher/classes', label: '📚 Classes' },
        { to: '/teacher/session', label: '🎯 Session' },
        { to: '/teacher/manual-attendance', label: '✏️ Manual' },
        { to: '/teacher/marks', label: '📋 Marks' },
        { to: '/teacher/email', label: '✉️ Email' },
        { to: '/teacher/leave-approval', label: '📅 Leaves' },
        { to: '/teacher/feedback', label: '⭐ Feedback' },
        { to: '/teacher/suspicious-activities', label: '🚨 Suspicious' },
        { to: '/teacher/advanced-analytics', label: '📊 Analytics' },
        { to: '/teacher/reports', label: '📈 Reports' },
    ];

    const studentLinks = [
        { to: '/student/dashboard', label: '📊 Dashboard' },
        { to: '/student/scan', label: '📷 Mark Attendance' },
        { to: '/student/leave', label: '📅 Leave' },
        { to: '/student/feedback', label: '⭐ Feedback' },
        { to: '/student/reports', label: '📈 Reports' },
    ];

    const links = isTeacher ? teacherLinks : isStudent ? studentLinks : [];

    return (
        <nav className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700/50 shadow-sm">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">

                    {/* Logo */}
                    <NavLink to="/" className="flex items-center space-x-2.5 group shrink-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-all duration-300">
                            <span className="text-white text-base font-bold">A</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-base font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent leading-tight">
                                AttendEase
                            </span>
                            <span className="text-[9px] text-gray-400 font-medium -mt-0.5">Smart Attendance</span>
                        </div>
                    </NavLink>

                    {/* Desktop Nav Links — scrollable strip */}
                    <div className="hidden md:flex items-center gap-0.5 overflow-x-auto no-scrollbar flex-1 mx-4">
                        {links.map(({ to, label }) => (
                            <NavLink key={to} to={to} className={linkClass}>
                                {label}
                            </NavLink>
                        ))}
                    </div>

                    {/* Right side controls */}
                    <div className="flex items-center gap-2 shrink-0">

                        {/* Theme Toggle */}
                        <button
                            id="theme-toggle"
                            onClick={toggleTheme}
                            className="p-2 rounded-xl bg-gray-100 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all duration-300 hover:scale-105 active:scale-95"
                            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                            {darkMode ? (
                                <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                                </svg>
                            )}
                        </button>

                        {/* User chip — hidden on very small screens */}
                        {user && (
                            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-100 dark:border-indigo-800/30">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                    {user.name?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 max-w-[90px] truncate leading-tight">
                                        {user.name}
                                    </span>
                                    <span className="text-[9px] text-indigo-500 dark:text-indigo-400 capitalize font-medium">{user.role}</span>
                                </div>
                            </div>
                        )}

                        {/* Logout — always visible with text label on md+ */}
                        <button
                            id="logout-btn"
                            onClick={handleLogout}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-md shadow-rose-500/25 transition-all duration-300 hover:scale-105 active:scale-95"
                            title="Logout"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span className="hidden md:inline">Logout</span>
                        </button>

                        {/* Mobile hamburger */}
                        <button
                            onClick={() => setMobileOpen(!mobileOpen)}
                            className="md:hidden p-2 rounded-xl text-gray-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all duration-300 active:scale-95"
                        >
                            <svg className="w-6 h-6" style={{ transform: mobileOpen ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.3s' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {mobileOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                {mobileOpen && (
                    <div className="md:hidden pb-4 mobile-menu-enter">
                        <div className="flex flex-col space-y-1 mt-2 p-2 rounded-2xl bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/10 dark:to-purple-900/10 border border-indigo-100/50 dark:border-indigo-800/20">
                            {links.map(({ to, label }) => (
                                <NavLink key={to} to={to} className={mobileLinkClass} onClick={() => setMobileOpen(false)}>
                                    {label}
                                </NavLink>
                            ))}
                            <div className="border-t border-indigo-100 dark:border-indigo-800/20 my-1" />
                            <button
                                onClick={handleLogout}
                                className="px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-3 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Logout
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;

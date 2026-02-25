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
        `px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 relative group ${isActive
            ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-600 dark:text-indigo-400'
            : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20'
        }`;

    const mobileLinkClass = ({ isActive }) =>
        `px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-3 ${isActive
            ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-600 dark:text-indigo-400 font-semibold'
            : 'text-gray-600 dark:text-gray-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10'
        }`;

    return (
        <nav className="sticky top-0 z-50 bg-white dark:bg-dark-800 border-b border-gray-100 dark:border-dark-700/50 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <NavLink to="/" className="flex items-center space-x-2.5 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/30 transition-all duration-300 group-hover:scale-105">
                            <span className="text-white text-lg font-bold">A</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-lg font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent leading-tight">
                                AttendEase
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium -mt-0.5">Smart Attendance</span>
                        </div>
                    </NavLink>

                    {/* Desktop Nav Links */}
                    <div className="hidden md:flex items-center space-x-1">
                        {isTeacher && (
                            <>
                                <NavLink to="/teacher/dashboard" className={linkClass}>
                                    <span className="flex items-center gap-1.5">📊 Dashboard</span>
                                </NavLink>
                                <NavLink to="/teacher/classes" className={linkClass}>
                                    <span className="flex items-center gap-1.5">📚 Classes</span>
                                </NavLink>
                                <NavLink to="/teacher/session" className={linkClass}>
                                    <span className="flex items-center gap-1.5">🎯 Session</span>
                                </NavLink>
                                <NavLink to="/teacher/manual-attendance" className={linkClass}>
                                    <span className="flex items-center gap-1.5">✏️ Manual</span>
                                </NavLink>
                                <NavLink to="/teacher/reports" className={linkClass}>
                                    <span className="flex items-center gap-1.5">📈 Reports</span>
                                </NavLink>
                            </>
                        )}
                        {isStudent && (
                            <>
                                <NavLink to="/student/dashboard" className={linkClass}>
                                    <span className="flex items-center gap-1.5">📊 Dashboard</span>
                                </NavLink>
                                <NavLink to="/student/scan" className={linkClass}>
                                    <span className="flex items-center gap-1.5">📷 Mark Attendance</span>
                                </NavLink>
                                <NavLink to="/student/reports" className={linkClass}>
                                    <span className="flex items-center gap-1.5">📈 Reports</span>
                                </NavLink>
                            </>
                        )}
                    </div>

                    {/* Right side */}
                    <div className="flex items-center space-x-2">
                        {/* Theme Toggle */}
                        <button
                            id="theme-toggle"
                            onClick={toggleTheme}
                            className="p-2.5 rounded-xl bg-gray-100 dark:bg-dark-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all duration-300 hover:scale-105 active:scale-95"
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

                        {/* User Info */}
                        {user && (
                            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-100 dark:border-indigo-800/30">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                    {user.name?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 max-w-[100px] truncate leading-tight">
                                        {user.name}
                                    </span>
                                    <span className="text-[10px] text-indigo-500 dark:text-indigo-400 capitalize font-medium">{user.role}</span>
                                </div>
                            </div>
                        )}

                        {/* Logout */}
                        <button
                            id="logout-btn"
                            onClick={handleLogout}
                            className="p-2.5 rounded-xl text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all duration-300 hover:scale-105 active:scale-95"
                            title="Logout"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setMobileOpen(!mobileOpen)}
                            className="md:hidden p-2.5 rounded-xl text-gray-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all duration-300 active:scale-95"
                        >
                            <svg className="w-6 h-6 transition-transform duration-300" style={{ transform: mobileOpen ? 'rotate(90deg)' : 'rotate(0)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                            {isTeacher && (
                                <>
                                    <NavLink to="/teacher/dashboard" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>📊 Dashboard</NavLink>
                                    <NavLink to="/teacher/classes" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>📚 Classes</NavLink>
                                    <NavLink to="/teacher/session" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>🎯 Session</NavLink>
                                    <NavLink to="/teacher/manual-attendance" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>✏️ Manual</NavLink>
                                    <NavLink to="/teacher/reports" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>📈 Reports</NavLink>
                                </>
                            )}
                            {isStudent && (
                                <>
                                    <NavLink to="/student/dashboard" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>📊 Dashboard</NavLink>
                                    <NavLink to="/student/scan" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>📷 Mark Attendance</NavLink>
                                    <NavLink to="/student/reports" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>📈 Reports</NavLink>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;

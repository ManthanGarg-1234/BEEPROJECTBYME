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
        `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
            ? 'bg-primary-500/10 text-primary-500 dark:text-primary-400'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700'
        }`;

    return (
        <nav className="sticky top-0 z-50 glass-card border-b border-gray-200/50 dark:border-dark-600/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <NavLink to="/" className="flex items-center space-x-2 group">
                        <span className="text-2xl">📋</span>
                        <span className="text-xl font-bold bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent group-hover:from-primary-400 group-hover:to-accent-400 transition-all">
                            AttendEase
                        </span>
                    </NavLink>

                    {/* Desktop Nav Links */}
                    <div className="hidden md:flex items-center space-x-1">
                        {isTeacher && (
                            <>
                                <NavLink to="/teacher/dashboard" className={linkClass}>Dashboard</NavLink>
                                <NavLink to="/teacher/classes" className={linkClass}>Classes</NavLink>
                                <NavLink to="/teacher/session" className={linkClass}>Session</NavLink>
                                <NavLink to="/teacher/manual-attendance" className={linkClass}>Manual</NavLink>
                                <NavLink to="/teacher/reports" className={linkClass}>Reports</NavLink>
                            </>
                        )}
                        {isStudent && (
                            <>
                                <NavLink to="/student/dashboard" className={linkClass}>Dashboard</NavLink>
                                <NavLink to="/student/scan" className={linkClass}>Scan QR</NavLink>
                            </>
                        )}
                    </div>

                    {/* Right side */}
                    <div className="flex items-center space-x-3">
                        {/* Theme Toggle */}
                        <button
                            id="theme-toggle"
                            onClick={toggleTheme}
                            className="p-2 rounded-lg bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 transition-all duration-200"
                            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                            {darkMode ? (
                                <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                                </svg>
                            )}
                        </button>

                        {/* User Info */}
                        {user && (
                            <div className="hidden sm:flex items-center space-x-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold">
                                    {user.name?.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[120px] truncate">
                                    {user.name}
                                </span>
                            </div>
                        )}

                        {/* Logout */}
                        <button
                            id="logout-btn"
                            onClick={handleLogout}
                            className="p-2 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                            title="Logout"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setMobileOpen(!mobileOpen)}
                            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-700"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <div className="md:hidden pb-4 animate-fade-in">
                        <div className="flex flex-col space-y-1">
                            {isTeacher && (
                                <>
                                    <NavLink to="/teacher/dashboard" className={linkClass} onClick={() => setMobileOpen(false)}>Dashboard</NavLink>
                                    <NavLink to="/teacher/classes" className={linkClass} onClick={() => setMobileOpen(false)}>Classes</NavLink>
                                    <NavLink to="/teacher/session" className={linkClass} onClick={() => setMobileOpen(false)}>Session</NavLink>
                                    <NavLink to="/teacher/manual-attendance" className={linkClass} onClick={() => setMobileOpen(false)}>Manual</NavLink>
                                    <NavLink to="/teacher/reports" className={linkClass} onClick={() => setMobileOpen(false)}>Reports</NavLink>
                                </>
                            )}
                            {isStudent && (
                                <>
                                    <NavLink to="/student/dashboard" className={linkClass} onClick={() => setMobileOpen(false)}>Dashboard</NavLink>
                                    <NavLink to="/student/scan" className={linkClass} onClick={() => setMobileOpen(false)}>Scan QR</NavLink>
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

import React, { useState, useEffect } from 'react';

/**
 * Toast Notification Component
 * Displays temporary notification alerts at the top of the screen
 */
const ToastContainer = () => {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        const handleShowToast = (event) => {
            const { message, type = 'info', duration = 5000 } = event.detail;
            const id = Date.now();

            setToasts(prev => [...prev, { id, message, type, duration }]);

            // Auto-remove toast after duration
            if (duration > 0) {
                setTimeout(() => {
                    removeToast(id);
                }, duration);
            }
        };

        window.addEventListener('show-toast', handleShowToast);
        return () => window.removeEventListener('show-toast', handleShowToast);
    }, []);

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <div className="fixed top-4 right-4 z-50 space-y-3 pointer-events-none" style={{ maxWidth: 450 }}>
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={`
                        toast-notification pointer-events-auto
                        ${toast.type === 'error' ? 'bg-red-500' :
                            toast.type === 'warning' ? 'bg-yellow-500' :
                            toast.type === 'success' ? 'bg-green-500' :
                            'bg-blue-500'
                        }
                        text-white rounded-lg shadow-2xl px-6 py-4
                        animate-slideIn
                    `}
                    style={{
                        animation: 'slideIn 0.3s ease-out, slideOut 0.3s ease-in 4.7s forwards',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.2)'
                    }}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                            <p className="font-semibold text-base">{toast.message}</p>
                        </div>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="flex-shrink-0 text-white hover:opacity-75 transition-opacity"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            ))}

            <style>{`
                @keyframes slideIn {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }

                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                }

                .animate-slideIn {
                    animation: slideIn 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};

export default ToastContainer;

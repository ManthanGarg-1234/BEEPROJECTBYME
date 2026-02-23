const LoadingSpinner = ({ message = 'Loading...' }) => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-dark-900 relative overflow-hidden">
            {/* Decorative blobs */}
            <div className="absolute top-1/4 -left-20 w-60 h-60 bg-gradient-to-br from-indigo-200 to-purple-200 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 -right-20 w-60 h-60 bg-gradient-to-br from-pink-200 to-rose-200 dark:from-pink-900/20 dark:to-rose-900/20 rounded-full blur-3xl"></div>

            {/* Spinner */}
            <div className="relative mb-8">
                {/* Outer ring */}
                <div className="w-20 h-20 rounded-full border-4 border-indigo-100 dark:border-indigo-900/30"></div>
                {/* Spinning gradient ring */}
                <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-indigo-500 border-r-purple-500 animate-spin"></div>
                {/* Center logo */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
                        <span className="text-white font-bold text-sm">A</span>
                    </div>
                </div>
                {/* Pulse ring */}
                <div className="absolute inset-0 w-20 h-20 rounded-full border-2 border-indigo-500/30 animate-ping"></div>
            </div>

            {/* Bouncing dots */}
            <div className="flex gap-1.5 mb-4">
                {[0, 1, 2].map(i => (
                    <div key={i}
                        className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                        style={{
                            animation: 'bounce 1s infinite',
                            animationDelay: `${i * 0.15}s`,
                        }}
                    />
                ))}
            </div>

            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">{message}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-medium bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
                AttendEase
            </p>
        </div>
    );
};

export default LoadingSpinner;

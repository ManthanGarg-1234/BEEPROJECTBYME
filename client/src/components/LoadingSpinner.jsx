const LoadingSpinner = ({ message = 'Loading...' }) => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-dark-900">
            <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-gray-200 dark:border-dark-600"></div>
                <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-transparent border-t-primary-500 animate-spin"></div>
            </div>
            <p className="mt-4 text-gray-500 dark:text-gray-400 text-sm font-medium">{message}</p>
        </div>
    );
};

export default LoadingSpinner;

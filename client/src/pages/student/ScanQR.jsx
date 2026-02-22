import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../../api';

const ScanQR = () => {
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [location, setLocation] = useState(null);
    const [locationError, setLocationError] = useState('');
    const [loading, setLoading] = useState(false);
    const [manualToken, setManualToken] = useState('');
    const scannerRef = useRef(null);
    const scannerInstanceRef = useRef(null);

    useEffect(() => {
        getLocation();
        return () => {
            if (scannerInstanceRef.current) {
                scannerInstanceRef.current.clear().catch(() => { });
            }
        };
    }, []);

    const getLocation = () => {
        if (!navigator.geolocation) {
            setLocationError('Geolocation not supported');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            () => setLocationError('Location access denied. Enable GPS.'),
            { enableHighAccuracy: true }
        );
    };

    const getDeviceId = () => {
        let id = localStorage.getItem('deviceId');
        if (!id) {
            id = 'DEV_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
            localStorage.setItem('deviceId', id);
        }
        return id;
    };

    const markAttendance = async (qrToken) => {
        if (!location) {
            setError('Location is required. Please enable GPS.');
            getLocation();
            return;
        }
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const res = await api.post('/attendance/mark', {
                qrToken,
                latitude: location.latitude,
                longitude: location.longitude,
                deviceId: getDeviceId()
            });
            setResult(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to mark attendance');
        } finally {
            setLoading(false);
        }
    };

    const startScanner = () => {
        setScanning(true);
        setError('');
        setResult(null);
        setTimeout(() => {
            if (!scannerRef.current) return;
            const scanner = new Html5QrcodeScanner('qr-reader', {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1
            }, false);
            scannerInstanceRef.current = scanner;
            scanner.render(
                (text) => {
                    scanner.clear().catch(() => { });
                    setScanning(false);
                    markAttendance(text);
                },
                (err) => { }
            );
        }, 100);
    };

    const stopScanner = () => {
        if (scannerInstanceRef.current) {
            scannerInstanceRef.current.clear().catch(() => { });
        }
        setScanning(false);
    };

    const handleManualSubmit = (e) => {
        e.preventDefault();
        if (manualToken.trim()) {
            markAttendance(manualToken.trim());
            setManualToken('');
        }
    };

    return (
        <div className="page-container animate-fade-in">
            <h1 className="section-title text-3xl mb-2">Scan QR Code</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">Scan the QR displayed by your teacher</p>

            <div className="max-w-lg mx-auto">
                {/* Location Status */}
                <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${location ? 'bg-green-500/10 border border-green-500/20' : 'bg-yellow-500/10 border border-yellow-500/20'
                    }`}>
                    <span className="text-xl">{location ? '📍' : '⏳'}</span>
                    <div>
                        <p className={`text-sm font-medium ${location ? 'text-green-500' : 'text-yellow-500'}`}>
                            {location ? 'Location Ready' : locationError || 'Getting location...'}
                        </p>
                        {location && <p className="text-xs text-gray-500">{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</p>}
                    </div>
                    {!location && <button onClick={getLocation} className="ml-auto text-primary-500 text-sm font-medium">Retry</button>}
                </div>

                {/* Result / Error */}
                {result && (
                    <div className="mb-6 p-6 rounded-xl bg-green-500/10 border border-green-500/30 text-center animate-slide-up">
                        <span className="text-5xl block mb-3">✅</span>
                        <p className="text-green-500 font-bold text-xl">{result.message}</p>
                        <p className="text-gray-500 text-sm mt-2">
                            Distance: {result.attendance?.distance?.toFixed(1)}m •
                            Time: {result.attendance?.markedAt ? new Date(result.attendance.markedAt).toLocaleTimeString() : ''}
                        </p>
                    </div>
                )}

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-center">
                        <span className="text-3xl block mb-2">❌</span>
                        <p className="text-red-400 font-medium">{error}</p>
                    </div>
                )}

                {/* Scanner */}
                <div className="glass-card-solid p-6 mb-6">
                    {!scanning ? (
                        <div className="text-center">
                            <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-r from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/30 mb-6">
                                <span className="text-5xl">📷</span>
                            </div>
                            <button onClick={startScanner} disabled={!location || loading}
                                className="btn-primary py-4 px-8 text-lg w-full">
                                {loading ? '⏳ Processing...' : '📷 Start Scanner'}
                            </button>
                        </div>
                    ) : (
                        <div>
                            <div id="qr-reader" ref={scannerRef} className="mb-4"></div>
                            <button onClick={stopScanner} className="w-full btn-secondary py-3">
                                ✕ Stop Scanner
                            </button>
                        </div>
                    )}
                </div>

                {/* Manual Entry */}
                <div className="glass-card-solid p-6">
                    <h3 className="font-semibold dark:text-white mb-3">Manual Token Entry</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        If scanning doesn't work, paste the QR token manually
                    </p>
                    <form onSubmit={handleManualSubmit} className="flex gap-3">
                        <input value={manualToken} onChange={(e) => setManualToken(e.target.value)}
                            className="input-field flex-1 font-mono text-xs" placeholder="Paste QR token..." />
                        <button type="submit" disabled={!manualToken.trim() || loading} className="btn-primary px-6">
                            Submit
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ScanQR;

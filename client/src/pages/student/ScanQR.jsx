import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../../api';

const ScanQR = () => {
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [location, setLocation] = useState(null);
    const [locationError, setLocationError] = useState('');
    const [locationLoading, setLocationLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [manualToken, setManualToken] = useState('');
    const [cameraError, setCameraError] = useState('');
    const scannerRef = useRef(null);
    const scannerInstanceRef = useRef(null);

    useEffect(() => {
        getLocation();
        return () => {
            stopScanner();
        };
    }, []);

    // Detect iOS/Safari
    const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSamsung = () => /SamsungBrowser/i.test(navigator.userAgent);

    const getLocation = () => {
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported on this browser. Please use Chrome or Safari.');
            return;
        }
        setLocationError('');
        setLocationLoading(true);

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocation({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy
                });
                setLocationLoading(false);
                setLocationError('');
            },
            (err) => {
                setLocationLoading(false);
                let msg = '';
                switch (err.code) {
                    case 1: // PERMISSION_DENIED
                        if (isIOS()) {
                            msg = 'Location denied. Go to Settings → Safari → Location → set to "Allow". Then reload this page.';
                        } else if (isSamsung()) {
                            msg = 'Location denied. Open phone Settings → Apps → Samsung Internet → Permissions → Location → Allow. Then reload.';
                        } else {
                            msg = 'Location denied. Tap the 🔒 icon in your browser address bar → Site Settings → Location → Allow. Then reload.';
                        }
                        break;
                    case 2: // POSITION_UNAVAILABLE
                        msg = 'Location unavailable. Make sure GPS/Location Services are turned ON in your phone settings, then tap Refresh.';
                        break;
                    case 3: // TIMEOUT
                        msg = 'Location timed out. Move near a window or step outside briefly for a better GPS signal, then tap Refresh.';
                        break;
                    default:
                        msg = 'Could not get location. Please check your settings and try again.';
                }
                setLocationError(msg);
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
        );
    };

    // Get a fresh location right before marking attendance
    const getFreshLocation = () => {
        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const loc = {
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                        accuracy: pos.coords.accuracy
                    };
                    setLocation(loc);
                    resolve(loc);
                },
                () => resolve(null),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    };

    const getDeviceId = () => {
        const fp = [
            navigator.userAgent,
            screen.width + 'x' + screen.height,
            screen.colorDepth,
            new Date().getTimezoneOffset(),
            navigator.language,
            navigator.platform,
            navigator.hardwareConcurrency || 'unknown',
            navigator.deviceMemory || 'unknown',
            navigator.maxTouchPoints || 0
        ];
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    fp.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
                }
            }
        } catch (e) { /* ignore */ }
        const str = fp.join('|||');
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'FP_' + Math.abs(hash).toString(36);
    };

    const markAttendance = async (qrToken) => {
        if (!location) {
            setError('Location is required. Please enable GPS and tap "🔄 Refresh".');
            getLocation();
            return;
        }
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const freshLoc = await getFreshLocation();
            const useLoc = freshLoc || location;
            const res = await api.post('/attendance/mark', {
                qrToken,
                latitude: useLoc.latitude,
                longitude: useLoc.longitude,
                deviceId: getDeviceId(),
                accuracy: useLoc.accuracy
            });
            setResult(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to mark attendance');
        } finally {
            setLoading(false);
        }
    };

    const startScanner = async () => {
        setError('');
        setResult(null);
        setCameraError('');

        // Request camera permission explicitly first (helps iOS/Samsung)
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            // Stop the test stream immediately
            stream.getTracks().forEach(track => track.stop());
        } catch (err) {
            let msg = 'Camera access denied. ';
            if (isIOS()) {
                msg += 'Go to Settings → Safari → Camera → Allow. Then reload this page.';
            } else if (isSamsung()) {
                msg += 'Open phone Settings → Apps → Samsung Internet → Permissions → Camera → Allow.';
            } else {
                msg += 'Tap the 🔒 icon in your address bar → Site Settings → Camera → Allow.';
            }
            setCameraError(msg);
            return;
        }

        setScanning(true);

        // Use Html5Qrcode directly for better iOS compatibility
        setTimeout(async () => {
            if (!scannerRef.current) return;
            try {
                const scanner = new Html5Qrcode('qr-reader');
                scannerInstanceRef.current = scanner;

                await scanner.start(
                    { facingMode: 'environment' },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1
                    },
                    (decodedText) => {
                        scanner.stop().catch(() => { });
                        scannerInstanceRef.current = null;
                        setScanning(false);
                        markAttendance(decodedText);
                    },
                    () => { } // ignore scan errors
                );
            } catch (err) {
                setScanning(false);
                let msg = 'Could not start camera. ';
                if (err.toString().includes('NotAllowedError')) {
                    if (isIOS()) {
                        msg += 'Safari needs camera permission. Go to Settings → Safari → Camera → Allow.';
                    } else {
                        msg += 'Please allow camera access when prompted.';
                    }
                } else if (err.toString().includes('NotFoundError')) {
                    msg += 'No camera found on this device.';
                } else if (err.toString().includes('NotReadableError')) {
                    msg += 'Camera is being used by another app. Close other camera apps and try again.';
                } else {
                    msg += 'Use the "Manual Token Entry" below as a fallback.';
                }
                setCameraError(msg);
            }
        }, 200);
    };

    const stopScanner = () => {
        if (scannerInstanceRef.current) {
            scannerInstanceRef.current.stop().catch(() => { });
            scannerInstanceRef.current = null;
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
        <div className="page-container">
            <h1 className="section-title text-3xl mb-2">Scan QR Code</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">Scan the QR displayed by your teacher</p>

            <div className="max-w-lg mx-auto">
                {/* Location Status */}
                <div className={`mb-6 p-4 rounded-xl ${location
                    ? 'bg-green-500/10 border border-green-500/20'
                    : locationError
                        ? 'bg-red-500/10 border border-red-500/20'
                        : 'bg-yellow-500/10 border border-yellow-500/20'
                    }`}>
                    <div className="flex items-center gap-3">
                        <span className="text-xl">{location ? '📍' : locationError ? '⚠️' : '⏳'}</span>
                        <div className="flex-1">
                            <p className={`text-sm font-medium ${location ? 'text-green-500' : locationError ? 'text-red-400' : 'text-yellow-500'}`}>
                                {locationLoading ? 'Getting location...' : location ? 'Location Ready' : 'Location Required'}
                            </p>
                            {location && <p className="text-xs text-gray-500">{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)} (±{Math.round(location.accuracy || 0)}m)</p>}
                        </div>
                        <button onClick={getLocation} disabled={locationLoading} className="text-primary-500 text-sm font-medium whitespace-nowrap">
                            {locationLoading ? '⏳' : '🔄 Refresh'}
                        </button>
                    </div>
                    {locationError && (
                        <p className="text-xs text-red-400 mt-2 leading-relaxed">{locationError}</p>
                    )}
                </div>

                {/* Camera Error */}
                {cameraError && (
                    <div className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
                        <div className="flex items-start gap-2">
                            <span className="text-lg">📸</span>
                            <div>
                                <p className="text-sm font-medium text-orange-400 mb-1">Camera Permission Needed</p>
                                <p className="text-xs text-orange-300 leading-relaxed">{cameraError}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Result / Error */}
                {result && (
                    <div className="mb-6 p-6 rounded-xl bg-green-500/10 border border-green-500/30 text-center">
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
                            {!location && !locationLoading && (
                                <p className="text-xs text-yellow-500 mt-3">Enable location first to start scanning</p>
                            )}
                        </div>
                    ) : (
                        <div>
                            <div id="qr-reader" ref={scannerRef} className="mb-4 rounded-lg overflow-hidden"></div>
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
                        If camera doesn't work, paste the QR token manually
                    </p>
                    <form onSubmit={handleManualSubmit} className="flex gap-3">
                        <input value={manualToken} onChange={(e) => setManualToken(e.target.value)}
                            className="input-field flex-1 font-mono text-xs" placeholder="Paste QR token..." />
                        <button type="submit" disabled={!manualToken.trim() || !location || loading} className="btn-primary px-6">
                            Submit
                        </button>
                    </form>
                </div>

                {/* Help Section for iOS/Samsung */}
                <details className="mt-6">
                    <summary className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-primary-500 transition-colors">
                        ❓ Having trouble? Tap here for help
                    </summary>
                    <div className="mt-3 p-4 rounded-xl bg-gray-500/5 border border-gray-500/10 text-xs text-gray-500 dark:text-gray-400 space-y-3">
                        <div>
                            <p className="font-semibold text-white mb-1">📱 iPhone / iPad (Safari)</p>
                            <ul className="list-disc ml-4 space-y-1">
                                <li>Go to <strong>Settings → Privacy → Location Services → ON</strong></li>
                                <li>Scroll to <strong>Safari → set to "While Using"</strong></li>
                                <li>For camera: <strong>Settings → Safari → Camera → Allow</strong></li>
                                <li>Reload this page after changing settings</li>
                            </ul>
                        </div>
                        <div>
                            <p className="font-semibold text-white mb-1">📱 Samsung Internet</p>
                            <ul className="list-disc ml-4 space-y-1">
                                <li>Go to <strong>Settings → Apps → Samsung Internet → Permissions</strong></li>
                                <li>Enable both <strong>Location</strong> and <strong>Camera</strong></li>
                                <li>Also check: <strong>Settings → Location → ON</strong></li>
                            </ul>
                        </div>
                        <div>
                            <p className="font-semibold text-white mb-1">📱 Chrome (Android)</p>
                            <ul className="list-disc ml-4 space-y-1">
                                <li>Tap the <strong>🔒 lock icon</strong> in address bar → <strong>Permissions</strong></li>
                                <li>Enable <strong>Location</strong> and <strong>Camera</strong></li>
                                <li>Make sure <strong>GPS is ON</strong> in phone settings</li>
                            </ul>
                        </div>
                    </div>
                </details>
            </div>
        </div>
    );
};

export default ScanQR;

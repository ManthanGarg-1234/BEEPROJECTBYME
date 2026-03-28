/**
 * Notification Manager - Handles all notification types
 * - Toast notifications (visual popups)
 * - Audio alerts (sound)
 * - Browser notifications (desktop/mobile)
 * - Page title badge
 */

// Audio alert - using Web Audio API to generate a beep if no audio file
const playAlertSound = () => {
    try {
        // Try to use Web Audio API to create a beep sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Alert tone: 800Hz for 200ms, then 1000Hz for 200ms
        oscillator.frequency.value = 800;
        oscillator.start();
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);

        setTimeout(() => {
            oscillator.frequency.value = 1000;
        }, 100);

        gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.3);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (err) {
        console.warn('Could not play alert sound:', err);
    }
};

// Request browser notification permission
export const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
        console.log('This browser does not support notifications');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        try {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        } catch (err) {
            console.error('Error requesting notification permission:', err);
            return false;
        }
    }

    return false;
};

// Show browser notification
export const showBrowserNotification = (title, options = {}) => {
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            new Notification(title, {
                icon: '/favicon.ico',
                badge: '/badge-icon.png',
                ...options
            });
        } catch (err) {
            console.error('Error showing notification:', err);
        }
    }
};

// Update page title with badge counter
export const updatePageTitleBadge = (count) => {
    const originalTitle = 'Attendance System';
    if (count > 0) {
        document.title = `(${count}) 🚨 ${originalTitle}`;
    } else {
        document.title = originalTitle;
    }
};

// Show toast notification (visual popup)
export const showToastNotification = (message, type = 'info', duration = 5000) => {
    // Dispatch custom event that will be caught by ToastContainer
    window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message, type, duration }
    }));
};

// Combined notification for proxy alert
export const notifyProxyAlert = (alertData) => {
    // 1. Play audio alert (high priority)
    playAlertSound();

    // 2. Show toast notification
    const toastMsg = `🚨 PROXY DETECTED: ${alertData.proxyStudent?.name || 'Unknown'} marking ${alertData.victimStudent?.name || 'Unknown'}'s attendance`;
    showToastNotification(toastMsg, 'error', 8000);

    // 3. Show browser notification
    showBrowserNotification('🚨 PROXY ATTENDANCE DETECTED!', {
        body: `${alertData.proxyStudent?.name} (${alertData.proxyStudent?.rollNumber}) is marking attendance for ${alertData.victimStudent?.name} (${alertData.victimStudent?.rollNumber})`,
        tag: 'proxy-alert',
        requireInteraction: true, // Keep until user dismisses
        actions: [
            { action: 'view', title: 'View Details' },
            { action: 'close', title: 'Dismiss' }
        ]
    });

    // 4. Update page title badge
    const currentCount = parseInt(document.title.match(/\(\d+\)/) || 0) || 0;
    updatePageTitleBadge(currentCount + 1);

    // Log for debugging
    console.warn('[PROXY ALERT]', alertData);
};

export default {
    playAlertSound,
    requestNotificationPermission,
    showBrowserNotification,
    updatePageTitleBadge,
    showToastNotification,
    notifyProxyAlert
};

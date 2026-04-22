import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import api from '../api';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const { token, isAuthenticated, user } = useAuth();

    useEffect(() => {
        if (isAuthenticated && token) {
            // Use API_URL for Socket connection (same backend as REST API)
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const SOCKET_URL = API_URL.replace('/api', ''); // Remove /api if present
            const newSocket = io(SOCKET_URL, {
                auth: { token },
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: 5
            });

            newSocket.on('connect', () => {
                console.log('[Socket] Connected:', newSocket.id);
                // Auto-join class rooms so the user receives class-level events
                // (e.g. session-started, dashboard-refresh)
                joinClassRooms(newSocket);
            });

            newSocket.on('connect_error', (err) => {
                console.error('[Socket] Connection error:', err.message);
            });

            setSocket(newSocket);

            return () => {
                newSocket.disconnect();
            };
        } else {
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
        }
    }, [isAuthenticated, token]);

    /**
     * Fetch the user's classes and join each class room so they receive
     * real-time events like session-started and dashboard-refresh.
     */
    const joinClassRooms = async (sock) => {
        try {
            const endpoint = user?.role === 'teacher' ? '/classes' : '/classes/enrolled';
            const res = await api.get(endpoint);
            const classes = res.data || [];
            classes.forEach((cls) => {
                const classId = cls.classId || cls;
                sock.emit('join-class', classId);
            });
            if (classes.length > 0) {
                console.log(`[Socket] Auto-joined ${classes.length} class room(s)`);
            }
        } catch (err) {
            // Non-critical — the user simply won't get class-level socket events
            console.warn('[Socket] Could not auto-join class rooms:', err.message);
        }
    };

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};

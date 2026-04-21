import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const { token, isAuthenticated } = useAuth();

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

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};

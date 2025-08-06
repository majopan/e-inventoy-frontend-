import { useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './auth';
import { toast } from 'react-toastify';

const InactivityHandler = () => {
    const { token, logout, user } = useAuth();

    useEffect(() => {
        // No hacer nada si no hay token o si el usuario es celador
        if (!token || user?.role === 'celador') return;

        let inactivityTimer;
        let warningTimer;
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        const warningTime = 25 * 60 * 1000; // 25 minutos para la advertencia
        const logoutTime = 30 * 60 * 1000; // 30 minutos para logout
        
        let warningShown = false;
        let hasLoggedOut = false;

        const showWarning = () => {
            if (warningShown || hasLoggedOut) return;
            warningShown = true;
            toast.info('Tu sesión se cerrará por inactividad en 5 minutos', {
                position: 'top-right',
                autoClose: 5 * 60 * 1000, // 5 minutos
                closeOnClick: true,
                draggable: true,
                pauseOnHover: true,
            });
        };

        const resetTimer = () => {
            if (hasLoggedOut) return;
            
            clearTimeout(inactivityTimer);
            clearTimeout(warningTimer);
            
            warningShown = false;
            toast.dismiss();
            
            // Enviar actividad al backend
            api.get('auth/keepalive/').catch(() => {});
            
            warningTimer = setTimeout(showWarning, warningTime);
            inactivityTimer = setTimeout(() => {
                handleInactivity();
            }, logoutTime);
        };

        const handleInactivity = async () => {
            if (hasLoggedOut) return;
            hasLoggedOut = true;
            
            toast.info('Has sido desconectado por inactividad.', {
                position: 'top-right',
                autoClose: 5000,
                closeOnClick: true,
                draggable: true,
                pauseOnHover: true,
            });
            logout();
            window.location.href = '/login';
        };

        const setupListeners = () => {
            events.forEach(event => {
                window.addEventListener(event, resetTimer, { passive: true });
            });
            resetTimer();
        };

        setupListeners();

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
            clearTimeout(inactivityTimer);
            clearTimeout(warningTimer);
            toast.dismiss();
        };
    }, [token, logout, user?.role]);

    return null;
};

export default InactivityHandler;
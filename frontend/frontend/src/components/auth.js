import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [authState, setAuthState] = useState(() => {
        const token = sessionStorage.getItem("token") || localStorage.getItem("token");
        const userData = JSON.parse(sessionStorage.getItem("userData") || localStorage.getItem("userData") || 'null');

        return {
            token,
            user: userData ? {
                ...userData,
                isAdmin: userData.is_admin || false,
                role: userData.role || 'guest',
                sedeId: userData.sede_id || null,
                sedeNombre: userData.sede_nombre || null
            } : null
        };
    });

    const [isVerifyingToken, setIsVerifyingToken] = useState(false);
    const keepaliveIntervalRef = useRef(null);

    const clearKeepaliveInterval = useCallback(() => {
        if (keepaliveIntervalRef.current) {
            clearInterval(keepaliveIntervalRef.current);
            keepaliveIntervalRef.current = null;
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            await api.post('auth/logout/');
        } catch (error) {
            console.error('Error during logout:', error);
        } finally {
            sessionStorage.removeItem("token");
            sessionStorage.removeItem("userData");
            localStorage.removeItem("token");
            localStorage.removeItem("userData");
            setAuthState({ token: null, user: null });
            clearKeepaliveInterval();
        }
    }, [clearKeepaliveInterval]);

    const verifyToken = useCallback(async (token) => {
        if (!token || isVerifyingToken) return false;

        setIsVerifyingToken(true);
        try {
            const response = await api.get('validate/', {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data.is_valid;
        } catch (error) {
            toast.error('Error al verificar el token. Inicia sesión nuevamente.');
            return false;
        } finally {
            setIsVerifyingToken(false);
        }
    }, [isVerifyingToken]);

    const refreshToken = useCallback(async () => {
        try {
            const response = await api.post('auth/refresh/', { token: authState.token });
            if (response.data.token) {
                const newState = {
                    token: response.data.token,
                    user: authState.user
                };
                setAuthState(newState);
                localStorage.setItem("token", response.data.token);
                sessionStorage.setItem("token", response.data.token);
                return true;
            }
        } catch (error) {
            toast.warning('Tu sesión ha expirado, por favor inicia sesión de nuevo.');
            logout();
        }
        return false;
    }, [authState.token, authState.user, logout]);

    const startKeepaliveInterval = useCallback((token, role) => {
        if (keepaliveIntervalRef.current) {
            clearInterval(keepaliveIntervalRef.current);
        }

        // Configurar intervalo según el rol
        const intervalTime = role === 'celador' ? 60 * 60 * 1000 : 5 * 60 * 1000; // 1 hora para celadores, 5 min para otros

        keepaliveIntervalRef.current = setInterval(async () => {
            try {
                const response = await api.get('auth/keepalive/', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                // Si el usuario es celador, extender la sesión
                if (role === 'celador') {
                    const newState = {
                        token: response.data.token || token,
                        user: authState.user
                    };
                    setAuthState(newState);
                    localStorage.setItem("token", newState.token);
                    sessionStorage.setItem("token", newState.token);
                }
            } catch (error) {
                const refreshed = await refreshToken();
                if (!refreshed) {
                    logout();
                }
            }
        }, intervalTime);
    }, [refreshToken, logout, authState.user]);

    const login = useCallback(async (token, userData, rememberMe = false) => {
        const storage = rememberMe ? localStorage : sessionStorage;
        const isValid = await verifyToken(token);

        if (!isValid) {
            throw new Error('Token inválido o expirado');
        }

        const extendedUserData = {
            ...userData,
            isAdmin: userData.is_admin || false,
            role: userData.role || 'guest',
            sedeId: userData.sede_id || null,
            sedeNombre: userData.sede_nombre || null
        };

        // Validar sede para roles que la requieren
        const rolesQueRequierenSede = ['coordinador', 'celador', 'seguridad'];
        if (rolesQueRequierenSede.includes(extendedUserData.role) && !extendedUserData.sedeId) {
            throw new Error('El usuario requiere una sede asignada');
        }

        storage.setItem("token", token);
        storage.setItem("userData", JSON.stringify(extendedUserData));
        setAuthState({ token, user: extendedUserData });
        startKeepaliveInterval(token, extendedUserData.role);

        return extendedUserData;
    }, [verifyToken, startKeepaliveInterval]);

    useEffect(() => {
        const checkToken = async () => {
            if (authState.token && !isVerifyingToken) {
                const isValid = await verifyToken(authState.token);
                if (!isValid) {
                    const refreshed = await refreshToken();
                    if (!refreshed) {
                        toast.warning('Tu sesión ha expirado');
                        logout();
                    }
                } else {
                    startKeepaliveInterval(authState.token, authState.user?.role);
                }
            }
        };

        checkToken();
        const interval = setInterval(checkToken, 15 * 60 * 1000); // 15 minutos

        return () => {
            clearInterval(interval);
            clearKeepaliveInterval();
        };
    }, [authState.token, authState.user?.role, verifyToken, refreshToken, logout, isVerifyingToken, startKeepaliveInterval, clearKeepaliveInterval]);

    useEffect(() => {
        return () => {
            clearKeepaliveInterval();
        };
    }, [clearKeepaliveInterval]);

    const value = {
        token: authState.token,
        user: authState.user,
        isAuthenticated: !!authState.token,
        isAdmin: authState.user?.isAdmin || false,
        role: authState.user?.role || 'guest',
        sedeId: authState.user?.sedeId || null,
        sedeNombre: authState.user?.sedeNombre || null,
        isVerifyingToken,
        login,
        logout,
        verifyToken,
        refreshToken
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe usarse dentro de un AuthProvider');
    }
    return context;
};
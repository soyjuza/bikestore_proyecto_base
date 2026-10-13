import { createContext, useCallback, useMemo, useState } from 'react';
import { login as loginService } from '../services/auth.service';
import { clearSession, getToken, getUser, saveSession } from '../utils/storage';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(getToken());
    const [user, setUser] = useState(getUser());

    const login = useCallback(async (credentials) => {
        const result = await loginService(credentials);
        saveSession(result.token, result.user);
        setToken(result.token);
        setUser(result.user);
        return result.user;
    }, []);

    const logout = useCallback(() => {
        clearSession();
        setToken(null);
        setUser(null);
    }, []);

    // después de editar «Mis datos»
    const updateUser = useCallback((next) => {
        saveSession(getToken(), next);
        setUser(next);
    }, []);

    const value = useMemo(
        () => ({
            token,
            user,
            isAuthenticated: Boolean(token && user),
            isAdmin: user?.rol === 'admin',
            login,
            logout,
            updateUser
        }),
        [token, user, login, logout, updateUser]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

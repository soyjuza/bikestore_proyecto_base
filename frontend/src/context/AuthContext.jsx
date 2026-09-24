import { createContext, useMemo, useState } from "react";
import { login as loginService } from '../services/auth.service';
import { clearSession, getToken, getUser, saveSession } from '../utils/storage';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] =  useState(getToken());
    const [user, setUser] = useState(getUser());

    async function login(credentials) {
        const result = await loginService(credentials);
        saveSession(result.token, result.user);
        setToken(result.token);
        setUser(result.user);
    }

    function logout() {
        clearSession();
        setToken(null);
        setUser(null);
    }

    const value = useMemo(
        () => (
            {
                token,
                user,
                isAuthenticated: Boolean(token),
                login,
                logout
            }),
            [token, user]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}


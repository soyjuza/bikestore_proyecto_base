import { USE_MOCK } from '../config/env';
import { api, json } from './api';
import * as mock from './mock/db';

export async function login(data) {
    if (USE_MOCK) return mock.login(data);
    const result = await api('/auth/login', { method: 'POST', body: json(data) });
    return { token: result.token, user: result.user };
}

export function register(data) {
    if (USE_MOCK) return mock.register(data);
    return api('/auth/register', { method: 'POST', body: json(data) });
}

// RF-16: el backend envía al correo un enlace con un token de un solo uso
export function requestPasswordReset(email) {
    if (USE_MOCK) return mock.requestPasswordReset(email);
    return api('/auth/recover', { method: 'POST', body: json({ email }) });
}

// valida el enlace al abrirlo: si ya se usó o venció, se muestra el aviso de una vez
export function checkResetToken(token) {
    if (USE_MOCK) return mock.checkResetToken(token);
    return api(`/auth/reset/${encodeURIComponent(token)}`);
}

export function resetPassword(token, password) {
    if (USE_MOCK) return mock.resetPassword(token, password);
    return api('/auth/reset', { method: 'POST', body: json({ token, password }) });
}

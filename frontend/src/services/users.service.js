import { USE_MOCK } from '../config/env';
import { api, json } from './api';
import * as mock from './mock/db';

/* ---- cuenta propia ---- */
export async function updateMe(data) {
    if (USE_MOCK) return mock.updateMe(data);
    return (await api('/users/me', { method: 'PUT', body: json(data) })).data;
}

export async function changePassword(data) {
    if (USE_MOCK) return mock.changePassword(data);
    return api('/users/me/password', { method: 'PUT', body: json(data) });
}

/* ---- administración (RF-27 a RF-31) ---- */
export async function getUsers() {
    if (USE_MOCK) return mock.listUsers();
    return (await api('/users')).data;
}

export async function updateUserRole(id, rol) {
    if (USE_MOCK) return mock.updateUserRole(id, rol);
    return (await api(`/users/${id}/rol`, { method: 'PATCH', body: json({ rol }) })).data;
}

export async function setUserActive(id, activo) {
    if (USE_MOCK) return mock.setUserActive(id, activo);
    return (await api(`/users/${id}/estado`, { method: 'PATCH', body: json({ activo }) })).data;
}

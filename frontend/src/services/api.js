import { API_URL } from '../config/env';
import { getToken } from '../utils/storage';

// Cliente HTTP: agrega el token JWT (Bearer) y convierte las respuestas de error en excepciones.
export async function api(endpoint, options = {}) {
    const token = getToken();
    const isFormData = options.body instanceof FormData;

    const headers = {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(data.message || 'Error en la solicitud');
        error.status = response.status;
        throw error;
    }

    return data;
}

export function json(body) {
    return JSON.stringify(body);
}

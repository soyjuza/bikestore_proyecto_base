export const API_URL =
    import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const SERVER_URL = API_URL.replace(/\/api\/?$/, '');

// Mientras el backend no esté terminado, los servicios usan datos de demostración (localStorage).
export const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? 'true') !== 'false';

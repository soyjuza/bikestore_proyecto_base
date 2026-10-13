import { SERVER_URL } from '../config/env';

export function money(n) {
    return '$' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function isoDate(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function today() {
    return isoDate(new Date());
}

// '2026-08-12' -> '12/08/2026'
export function dateCO(s) {
    const [y, m, d] = String(s).slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
}

export function plural(n, one, many) {
    return n === 1 ? one : many;
}

export function firstName(name) {
    return String(name || '').split(' ')[0];
}

export function initials(name) {
    return String(name || '').split(' ').map((w) => w[0]).slice(0, 2).join('');
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Las imágenes de la demo están en /public; las que sube el admin al backend llegan como nombre de archivo.
export function urlImagen(imagen) {
    if (!imagen) return null;
    if (/^(\/|https?:|data:|blob:)/.test(imagen)) return imagen;
    return `${SERVER_URL}/uploads/productos/${imagen}`;
}

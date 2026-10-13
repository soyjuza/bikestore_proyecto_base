const TOKEN_KEY = 'bikestore_token';
const USER_KEY = 'bikestore_user';
const GUEST_CART_KEY = 'bikestore_guest_cart';

function read(key) {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function write(key, value) {
    try {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
    } catch {
        // almacenamiento bloqueado (modo privado): la sesión dura lo que dure la pestaña
    }
}

export function saveSession(token, user) {
    write(TOKEN_KEY, token);
    write(USER_KEY, JSON.stringify(user));
}

export function getToken() {
    return read(TOKEN_KEY);
}

export function getUser() {
    const value = read(USER_KEY);
    try {
        return value ? JSON.parse(value) : null;
    } catch {
        return null;
    }
}

export function clearSession() {
    write(TOKEN_KEY, null);
    write(USER_KEY, null);
}

// carrito de quien compra sin cuenta (RF-08: al iniciar sesión se pasa a su cuenta)
export function getGuestCart() {
    try {
        return JSON.parse(read(GUEST_CART_KEY)) || [];
    } catch {
        return [];
    }
}

export function saveGuestCart(items) {
    write(GUEST_CART_KEY, items.length ? JSON.stringify(items) : null);
}

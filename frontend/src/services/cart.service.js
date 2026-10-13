import { USE_MOCK } from '../config/env';
import { api, json } from './api';
import * as mock from './mock/db';

// El carrito es una lista de { id_producto, cantidad }. Con sesión se guarda en la cuenta (RF-08).
export async function getCart() {
    if (USE_MOCK) return mock.getCart();
    return (await api('/cart')).data;
}

export async function saveCart(items) {
    if (USE_MOCK) return mock.saveCart(items);
    return (await api('/cart', { method: 'PUT', body: json({ items }) })).data;
}

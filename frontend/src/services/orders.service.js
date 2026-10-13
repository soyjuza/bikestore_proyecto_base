import { USE_MOCK } from '../config/env';
import { api, json } from './api';
import * as mock from './mock/db';

// RF-09..12: crea el pedido con el carrito guardado, simula el pago y descuenta existencias
export async function createOrder(data) {
    if (USE_MOCK) return mock.createOrder(data);
    return (await api('/orders', { method: 'POST', body: json(data) })).data;
}

export async function getMyOrders() {
    if (USE_MOCK) return mock.listMyOrders();
    return (await api('/orders/mine')).data;
}

export async function getMyOrder(numero) {
    if (USE_MOCK) return mock.getMyOrder(numero);
    return (await api(`/orders/mine/${encodeURIComponent(numero)}`)).data;
}

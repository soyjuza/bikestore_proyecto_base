import { USE_MOCK } from '../config/env';
import { api, json } from './api';
import * as mock from './mock/db';

export async function getProducts(options = {}) {
    if (USE_MOCK) return mock.listProducts(options);
    const query = options.incluirInactivos ? '?todos=1' : '';
    return (await api(`/products${query}`)).data;
}

export async function getProduct(id) {
    if (USE_MOCK) return mock.getProduct(id);
    return (await api(`/products/${id}`)).data;
}

function readAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
        reader.readAsDataURL(file);
    });
}

function toFormData(data) {
    const formData = new FormData();
    ['nombre', 'descripcion', 'categoria', 'precio', 'stock'].forEach((k) => formData.append(k, data[k] ?? ''));
    if (data.imagenFile) formData.append('imagen', data.imagenFile);
    return formData;
}

// RF-17, RF-18: la imagen viaja como archivo (multer en el backend)
export async function createProduct(data) {
    if (USE_MOCK) {
        const imagen = data.imagenFile ? await readAsDataURL(data.imagenFile) : null;
        return mock.createProduct({ ...data, imagen });
    }
    return (await api('/products', { method: 'POST', body: toFormData(data) })).data;
}

export async function updateProduct(id, data) {
    if (USE_MOCK) {
        const imagen = data.imagenFile ? await readAsDataURL(data.imagenFile) : null;
        return mock.updateProduct(id, { ...data, imagen });
    }
    return (await api(`/products/${id}`, { method: 'PUT', body: toFormData(data) })).data;
}

// RF-20: los productos no se borran, se inactivan
export async function setProductActive(id, activo) {
    if (USE_MOCK) return mock.setProductActive(id, activo);
    return (await api(`/products/${id}/estado`, { method: 'PATCH', body: json({ activo }) })).data;
}

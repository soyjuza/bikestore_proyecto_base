import { api } from "./api";

function toFormData(data) {
    const formData = new FormData();
    formData.append('nombre', data.nombre || '');
    formData.append('marca', data.marca || '');
    formData.append('modelo', data.modelo || '');

    if (data.imagenFile) {
        formData.append('imagen', data.imagenFile);
    }

    return formData;
}

export function getEquipos() {
    return api('/equipos');
}

export function createEquipo(data) {
    return api('/equipos', {
        method: 'POST',
        body: toFormData(data)
    });
}

export function updateEquipo(id, data) {
    return api(`/equipos/${id}`, {
        method: 'PUT',
        body: toFormData(data)
    });
}

export function deleteEquipo(id) {
    return api(`/equipos/${id}`, {
        method: 'DELETE'
    });
}
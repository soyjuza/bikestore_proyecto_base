import { API_URL, USE_MOCK } from '../config/env';
import { api } from './api';
import { getToken } from '../utils/storage';
import * as mock from './mock/db';
import { dateCO } from '../utils/format';

// RF-21..25: ventas, pedidos, más vendidos y alertas de inventario del periodo
export async function getDashboard(filters) {
    if (USE_MOCK) return mock.getDashboard(filters);
    const q = new URLSearchParams(filters).toString();
    return (await api(`/reports/dashboard?${q}`)).data;
}

function download(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        URL.revokeObjectURL(a.href);
        a.remove();
    }, 500);
}

function toCSV(report, filters, categoriaNombre) {
    const rows = [
        ['Informe BikeStore'],
        ['Periodo', dateCO(filters.desde) + ' a ' + dateCO(filters.hasta)],
        ['Categoría', categoriaNombre],
        [],
        ['Ventas totales', report.ventas],
        ['Pedidos', report.pedidosCount],
        ['Unidades vendidas', report.unidades],
        [],
        ['Productos más vendidos', 'Unidades', 'Valor'],
        ...report.masVendidos.map((t) => [t.nombre, t.cantidad, t.valor]),
        [],
        ['Número', 'Fecha', 'Cliente', 'Correo', 'Total'],
        ...report.pedidos.map((o) => [o.numero, dateCO(o.fecha), o.cliente, o.email, o.total])
    ];
    const cell = (c) => {
        const s = String(c ?? '');
        return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    return '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n');
}

// RF-26: en modo demo se arma un CSV que abre Excel; el backend real devuelve un .xlsx
export async function exportExcel(report, filters, categoriaNombre) {
    const name = `informe-bikestore-${filters.desde}-a-${filters.hasta}`;
    if (USE_MOCK) {
        download(new Blob([toCSV(report, filters, categoriaNombre)], { type: 'text/csv;charset=utf-8' }), name + '.csv');
        return;
    }
    const q = new URLSearchParams(filters).toString();
    const res = await fetch(`${API_URL}/reports/export/excel?${q}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
    });
    if (!res.ok) throw new Error('No se pudo generar el informe');
    download(await res.blob(), name + '.xlsx');
}

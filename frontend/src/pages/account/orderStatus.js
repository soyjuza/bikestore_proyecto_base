import { today } from '../../utils/format';

// Estado de envío simulado según los días desde la compra (el backend real lo guardará en la tabla pedidos).
export const ESTADOS = ['Pagado', 'En preparación', 'Enviado', 'Entregado'];

export function orderStep(order) {
    if (order.estado && ESTADOS.includes(order.estado)) return ESTADOS.indexOf(order.estado);
    const days = Math.round((new Date(today() + 'T00:00:00') - new Date(order.fecha.slice(0, 10) + 'T00:00:00')) / 864e5);
    return days < 1 ? 1 : days < 3 ? 2 : 3;
}

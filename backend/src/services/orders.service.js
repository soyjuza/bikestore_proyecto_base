const pool = require("../config/db");
const AppError = require("../utils/AppError");
const notImplemented = require("../utils/notImplemented");

/* RF-09..12: pedido con número único y pago simulado.
   Formato que espera el frontend:
   { numero, fecha, cliente, email, direccion, ciudad, telefono, ultimos4, total,
     items: [{ id_producto, nombre, categoria, precio, cantidad }] }

   TODO createOrder(idUsuario, { direccion, ciudad, telefono, numeroCuenta }):
     1. Validar los datos de envío (y que numeroCuenta tenga 12 a 19 dígitos).
     2. Leer el carrito del usuario con los productos (SELECT ... FOR UPDATE dentro de una transacción).
     3. Si el carrito está vacío -> AppError 400. Si alguna cantidad supera el stock -> AppError 409.
     4. Pago simulado: si numeroCuenta termina en 0000 -> AppError('La pasarela rechazó el pago...', 402).
     5. INSERT INTO pedidos (...) y obtener el id; el número único es
        'BS-' + año + '-' + id con 5 dígitos (ej. BS-2026-00031) -> UPDATE pedidos SET numero = ?.
     6. INSERT INTO pedido_detalle copiando nombre y precio del momento de la compra.
     7. UPDATE productos SET stock = stock - cantidad.
     8. DELETE FROM carrito_items WHERE id_usuario = ?.
     9. COMMIT y devolver el pedido completo (getUserOrder).

   TODO listUserOrders(idUsuario): pedidos del usuario con sus items, más recientes primero.
   TODO getUserOrder(idUsuario, numero): un pedido del usuario (404 si no es suyo o no existe). */
async function createOrder(idUsuario, data) {
  notImplemented("Crear pedido");
}

async function listUserOrders(idUsuario) {
  notImplemented("Consultar pedidos");
}

async function getUserOrder(idUsuario, numero) {
  notImplemented("Consultar pedido");
}

module.exports = { createOrder, listUserOrders, getUserOrder };

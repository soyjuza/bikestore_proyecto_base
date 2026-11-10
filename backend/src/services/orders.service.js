const pool = require("../config/db");
const AppError = require("../utils/AppError");
const notImplemented = require("../utils/notImplemented");

/* RF-09..12: pedido con número único y pago simulado.
   Formato que espera el frontend:
   { numero, fecha, cliente, email, direccion, ciudad, telefono, ultimos4, total,
     items: [{ id_producto, nombre, categoria, precio, cantidad }] }

   TODO createOrder(idUsuario, { direccion, ciudad, telefono, numeroCuenta }):
     1. Validar los datos de envío (y que numeroCuenta tenga 12 a 19 dígitos).
     2. Leer el pedido en estado 'Carrito' del usuario con sus productos
        (SELECT ... FOR UPDATE dentro de una transacción).
     3. Si el carrito está vacío -> AppError 400. Si alguna cantidad supera el stock -> AppError 409.
     4. Pago simulado: si numeroCuenta termina en 0000 -> AppError('La pasarela rechazó el pago...', 402).
     5. No se crea otro pedido: el mismo pedido del carrito se convierte en compra.
        UPDATE pedido_detalle SET precio = (precio actual del producto) WHERE id_pedido = ?.
     6. UPDATE pedidos SET estado = 'Pagado', fecha = NOW(), direccion, ciudad, telefono, ultimos4,
        total = SUM(precio * cantidad), numero = 'BS-' + año + '-' + id con 5 dígitos (ej. BS-2026-00031).
     7. UPDATE productos SET stock = stock - cantidad.
     8. COMMIT y devolver el pedido completo (getUserOrder). El siguiente carrito del cliente será
        un pedido nuevo en estado 'Carrito' (lo crea replaceCart cuando agregue algo).

   nombre y categoria de cada item salen de JOIN con productos (ya no se copian en pedido_detalle).

   TODO listUserOrders(idUsuario): pedidos del usuario con sus items, más recientes primero
        (sin el que está en 'Carrito': estado <> 'Carrito').
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

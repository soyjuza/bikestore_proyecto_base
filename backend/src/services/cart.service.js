const pool = require("../config/db");
const AppError = require("../utils/AppError");
const notImplemented = require("../utils/notImplemented");

/* RF-06..08: carrito guardado en la cuenta.
   El carrito es el pedido del usuario que está en estado 'Carrito' (máximo uno por usuario);
   sus productos están en pedido_detalle con precio en NULL.
   Formato que espera el frontend: [{ id_producto, cantidad }]

   TODO getCart(idUsuario):
     SELECT d.id_producto, d.cantidad
       FROM pedidos p JOIN pedido_detalle d ON d.id_pedido = p.id_pedido
      WHERE p.id_usuario = ? AND p.estado = 'Carrito'
     (si no hay pedido en 'Carrito', devolver [])

   TODO replaceCart(idUsuario, items):
     1. Validar que cada item tenga id_producto y cantidad entera >= 1.
     2. Limitar cada cantidad al stock del producto (y descartar productos inactivos).
     3. En una transacción: buscar el pedido 'Carrito' del usuario (SELECT ... FOR UPDATE);
        si no existe, INSERT INTO pedidos (id_usuario) VALUES (?)  -> nace en estado 'Carrito'.
        Luego DELETE FROM pedido_detalle WHERE id_pedido = ? y INSERT de cada item (precio NULL).
     4. Devolver el carrito guardado (getCart). */
async function getCart(idUsuario) {
  notImplemented("Consultar carrito");
}

async function replaceCart(idUsuario, items) {
  notImplemented("Guardar carrito");
}

module.exports = { getCart, replaceCart };

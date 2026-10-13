const pool = require("../config/db");
const AppError = require("../utils/AppError");
const notImplemented = require("../utils/notImplemented");

/* RF-06..08: carrito guardado en la cuenta (tabla carrito_items).
   Formato que espera el frontend: [{ id_producto, cantidad }]

   TODO getCart(idUsuario):
     SELECT id_producto, cantidad FROM carrito_items WHERE id_usuario = ?

   TODO replaceCart(idUsuario, items):
     1. Validar que cada item tenga id_producto y cantidad entera >= 1.
     2. Limitar cada cantidad al stock del producto (y descartar productos inactivos).
     3. En una transacción: DELETE FROM carrito_items WHERE id_usuario = ?
        y luego INSERT de cada item.
     4. Devolver el carrito guardado (getCart). */
async function getCart(idUsuario) {
  notImplemented("Consultar carrito");
}

async function replaceCart(idUsuario, items) {
  notImplemented("Guardar carrito");
}

module.exports = { getCart, replaceCart };

const pool = require("../config/db");
const AppError = require("../utils/AppError");
const { enteroPositivo } = require("../utils/validar");

const MAX_PRODUCTOS = 100;

/* RF-06..08: carrito guardado en la cuenta.
   El carrito es el pedido del usuario que está en estado 'Carrito' (máximo uno por usuario);
   sus productos están en pedido_detalle con precio en NULL.
   Formato que espera el frontend: [{ id_producto, cantidad }] */
async function getCart(idUsuario) {
  const [rows] = await pool.execute(
    `SELECT d.id_producto, d.cantidad
       FROM pedidos p
       JOIN pedido_detalle d ON d.id_pedido = p.id_pedido
      WHERE p.id_usuario = ? AND p.estado = 'Carrito'
      ORDER BY d.id_producto`,
    [idUsuario],
  );
  return rows;
}

// Deja una sola línea por producto y revisa que id y cantidad sean enteros mayores que cero
function limpiarItems(items) {
  if (!Array.isArray(items) || items.length > MAX_PRODUCTOS) {
    throw new AppError("El carrito no es válido.", 400);
  }

  const cantidades = new Map();

  for (const item of items) {
    const idProducto = enteroPositivo(item?.id_producto);
    const cantidad = enteroPositivo(item?.cantidad);

    if (!idProducto || !cantidad) {
      throw new AppError("Cada producto del carrito debe tener una cantidad entera mayor que cero.", 400);
    }
    cantidades.set(idProducto, (cantidades.get(idProducto) || 0) + cantidad);
  }

  return cantidades;
}

// Reemplaza el carrito completo por la lista que envía el frontend (RF-05, RF-07)
async function replaceCart(idUsuario, items) {
  const cantidades = limpiarItems(items);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Se bloquea la fila del usuario: si llegan dos cambios del carrito al mismo tiempo
    // (dos clics seguidos), el segundo espera al primero y no se crean dos carritos.
    await conn.execute("SELECT id_usuario FROM usuarios WHERE id_usuario = ? FOR UPDATE", [idUsuario]);

    const [carritos] = await conn.execute(
      "SELECT id_pedido FROM pedidos WHERE id_usuario = ? AND estado = 'Carrito'",
      [idUsuario],
    );

    let idPedido = carritos[0]?.id_pedido;
    if (!idPedido) {
      const [result] = await conn.execute("INSERT INTO pedidos (id_usuario) VALUES (?)", [idUsuario]);
      idPedido = result.insertId;
    }

    await conn.execute("DELETE FROM pedido_detalle WHERE id_pedido = ?", [idPedido]);

    for (const [idProducto, cantidad] of cantidades) {
      const [productos] = await conn.execute(
        "SELECT stock FROM productos WHERE id_producto = ? AND activo = 1",
        [idProducto],
      );

      // se descartan los productos que no existen, los inactivos y los agotados
      if (!productos.length || productos[0].stock < 1) continue;

      // no se puede pedir más de lo que hay
      await conn.execute(
        "INSERT INTO pedido_detalle (id_pedido, id_producto, cantidad) VALUES (?,?,?)",
        [idPedido, idProducto, Math.min(cantidad, productos[0].stock)],
      );
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  return getCart(idUsuario);
}

module.exports = { getCart, replaceCart };

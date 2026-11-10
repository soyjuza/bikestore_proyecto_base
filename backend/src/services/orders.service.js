const pool = require("../config/db");
const AppError = require("../utils/AppError");
const { texto } = require("../utils/validar");

/* RF-09..12: pedido con número único y pago simulado.
   Formato que espera el frontend:
   { numero, fecha, estado, cliente, email, direccion, ciudad, telefono, ultimos4, total,
     items: [{ id_producto, nombre, categoria, precio, cantidad }] } */

const SELECT_PEDIDOS = `
  SELECT p.id_pedido, p.numero, p.fecha, p.estado, u.nombre AS cliente, u.email,
         p.direccion, p.ciudad, p.telefono, p.ultimos4, p.total,
         d.id_producto, pr.nombre, pr.categoria, d.precio, d.cantidad
    FROM pedidos p
    JOIN usuarios u ON u.id_usuario = p.id_usuario
    JOIN pedido_detalle d ON d.id_pedido = p.id_pedido
    JOIN productos pr ON pr.id_producto = d.id_producto`;

// La consulta trae una fila por producto; aquí se arma un pedido con su lista de items
function agrupar(rows) {
  const pedidos = new Map();

  for (const row of rows) {
    if (!pedidos.has(row.id_pedido)) {
      pedidos.set(row.id_pedido, {
        numero: row.numero,
        fecha: row.fecha,
        estado: row.estado,
        cliente: row.cliente,
        email: row.email,
        direccion: row.direccion,
        ciudad: row.ciudad,
        telefono: row.telefono,
        ultimos4: row.ultimos4,
        total: Number(row.total),
        items: [],
      });
    }
    pedidos.get(row.id_pedido).items.push({
      id_producto: row.id_producto,
      nombre: row.nombre,
      categoria: row.categoria,
      precio: Number(row.precio),
      cantidad: row.cantidad,
    });
  }

  return [...pedidos.values()];
}

function validarEnvio(data) {
  const direccion = texto(data.direccion);
  const ciudad = texto(data.ciudad);
  const telefono = texto(data.telefono);
  const cuenta = typeof data.numeroCuenta === "string" ? data.numeroCuenta.replace(/[\s-]/g, "") : "";

  if (!direccion || !ciudad || !telefono || !cuenta) {
    throw new AppError("Faltan datos de pago o de envío. Complete los campos marcados.", 400);
  }
  if (!/^\d{12,19}$/.test(cuenta)) {
    throw new AppError("El número de tarjeta o cuenta debe tener entre 12 y 19 dígitos.", 400);
  }
  if (telefono.length > 30 || telefono.replace(/\D/g, "").length < 7) {
    throw new AppError("Escriba un número de celular válido.", 400);
  }
  if (direccion.length > 200 || ciudad.length > 100) {
    throw new AppError("La dirección o la ciudad son demasiado largas.", 400);
  }

  return { direccion, ciudad, telefono, cuenta };
}

// Convierte el carrito del cliente en una compra. Todo va en una transacción:
// si algo falla (sin existencias, pago rechazado) no se cambia nada.
async function createOrder(idUsuario, data) {
  const { direccion, ciudad, telefono, cuenta } = validarEnvio(data);
  const conn = await pool.getConnection();
  let numero;

  try {
    await conn.beginTransaction();

    // mismo bloqueo que al guardar el carrito: mientras se paga nadie más lo modifica
    await conn.execute("SELECT id_usuario FROM usuarios WHERE id_usuario = ? FOR UPDATE", [idUsuario]);

    const [carritos] = await conn.execute(
      "SELECT id_pedido FROM pedidos WHERE id_usuario = ? AND estado = 'Carrito'",
      [idUsuario],
    );
    const idPedido = carritos[0]?.id_pedido;

    // Los productos quedan bloqueados hasta el COMMIT para que dos clientes
    // no compren al tiempo la última unidad.
    const [lineas] = idPedido
      ? await conn.execute(
          `SELECT d.id_producto, d.cantidad, pr.nombre, pr.precio, pr.stock, pr.activo
             FROM pedido_detalle d
             JOIN productos pr ON pr.id_producto = d.id_producto
            WHERE d.id_pedido = ?
            ORDER BY d.id_producto
              FOR UPDATE`,
          [idPedido],
        )
      : [[]];

    const activas = lineas.filter((l) => l.activo);

    if (!activas.length) {
      throw new AppError("Tu carrito está vacío.", 400);
    }

    for (const l of activas) {
      if (l.cantidad > l.stock) {
        throw new AppError(`Solo quedan ${l.stock} unidades de ${l.nombre}. Ajusta el carrito.`, 409);
      }
    }

    // Pago simulado: una cuenta terminada en 0000 es rechazada por la pasarela
    if (cuenta.endsWith("0000")) {
      throw new AppError("La pasarela rechazó el pago. Revise los datos de la cuenta o use otra.", 402);
    }

    // los productos que inactivaron mientras estaban en el carrito no entran en la compra
    await conn.execute(
      `DELETE d FROM pedido_detalle d
         JOIN productos pr ON pr.id_producto = d.id_producto
        WHERE d.id_pedido = ? AND pr.activo = 0`,
      [idPedido],
    );

    // El precio se toma de la tabla productos en este momento, nunca de lo que envía el navegador
    let total = 0;
    for (const l of activas) {
      await conn.execute(
        "UPDATE pedido_detalle SET precio = ? WHERE id_pedido = ? AND id_producto = ?",
        [l.precio, idPedido, l.id_producto],
      );
      await conn.execute(
        "UPDATE productos SET stock = stock - ? WHERE id_producto = ?",
        [l.cantidad, l.id_producto],
      );
      total += Number(l.precio) * l.cantidad;
    }

    // RF-10: el número sale del id del pedido, por eso no se repite. Ej.: BS-2026-00031
    numero = `BS-${new Date().getFullYear()}-${String(idPedido).padStart(5, "0")}`;

    // del número de cuenta solo se guardan los últimos 4 dígitos
    await conn.execute(
      `UPDATE pedidos
          SET estado = 'Pagado', fecha = NOW(), numero = ?, direccion = ?, ciudad = ?,
              telefono = ?, ultimos4 = ?, total = ?
        WHERE id_pedido = ?`,
      [numero, direccion, ciudad, telefono, cuenta.slice(-4), total, idPedido],
    );

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  // el próximo carrito del cliente será un pedido nuevo (lo crea replaceCart cuando agregue algo)
  return getUserOrder(idUsuario, numero);
}

// Historial del cliente, del más reciente al más viejo. El carrito no cuenta como pedido.
async function listUserOrders(idUsuario) {
  const [rows] = await pool.execute(
    `${SELECT_PEDIDOS}
      WHERE p.id_usuario = ? AND p.estado <> 'Carrito'
      ORDER BY p.fecha DESC, p.id_pedido DESC, d.id_producto`,
    [idUsuario],
  );
  return agrupar(rows);
}

// Siempre se filtra por el dueño: un cliente no puede ver el pedido de otro aunque sepa el número
async function getUserOrder(idUsuario, numero) {
  if (typeof numero !== "string" || !/^BS-\d{4}-\d{5,10}$/.test(numero)) {
    throw new AppError("Pedido no encontrado", 404);
  }

  const [rows] = await pool.execute(
    `${SELECT_PEDIDOS}
      WHERE p.id_usuario = ? AND p.numero = ? AND p.estado <> 'Carrito'
      ORDER BY d.id_producto`,
    [idUsuario, numero],
  );

  if (!rows.length) {
    throw new AppError("Pedido no encontrado", 404);
  }

  return agrupar(rows)[0];
}

module.exports = { createOrder, listUserOrders, getUserOrder };

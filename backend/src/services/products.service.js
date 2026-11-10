const fs = require("fs/promises");
const path = require("path");
const pool = require("../config/db");
const AppError = require("../utils/AppError");
const { texto, enteroPositivo, escaparLike } = require("../utils/validar");
const { UPLOAD_DIR } = require("../middlewares/upload.middleware");

const COLUMNS = "id_producto, nombre, descripcion, categoria, precio, stock, activo, imagen, foto";
const PRECIO_MAX = 999999999;
const STOCK_MAX = 100000;

// El orden nunca se arma con lo que escribe el usuario: se escoge una de estas tres opciones
const ORDEN = {
  asc: "precio ASC, id_producto ASC",
  desc: "precio DESC, id_producto ASC",
  ninguno: "id_producto ASC",
};

function toProduct(row) {
  return { ...row, precio: Number(row.precio), activo: Boolean(row.activo) };
}

async function borrarImagenSiExiste(imagen) {
  // las imágenes de la demo están en el frontend (/img/...); solo se borran las subidas al servidor
  if (!imagen || imagen.startsWith("/")) return;

  try {
    await fs.unlink(path.join(UPLOAD_DIR, path.basename(imagen)));
  } catch {
    // si el archivo ya no existe en disco no es un error del usuario
  }
}

// Revisa los datos del formulario del administrador y los devuelve limpios
async function validar(data) {
  const nombre = texto(data.nombre);
  const descripcion = texto(data.descripcion);
  const categoria = texto(data.categoria);
  const precio = String(data.precio ?? "").trim();
  const stock = String(data.stock ?? "").trim();

  if (!nombre || !descripcion || !categoria || precio === "" || stock === "") {
    throw new AppError("Complete todos los campos.", 400);
  }
  if (nombre.length > 120) {
    throw new AppError("El nombre no puede tener más de 120 caracteres.", 400);
  }
  if (descripcion.length > 2000) {
    throw new AppError("La descripción no puede tener más de 2000 caracteres.", 400);
  }
  if (!/^\d+(\.\d+)?$/.test(precio) || !(Number(precio) > 0)) {
    throw new AppError("El precio debe ser mayor que cero.", 400);
  }
  if (Math.round(Number(precio)) > PRECIO_MAX) {
    throw new AppError("El precio es demasiado alto.", 400);
  }
  if (!/^\d+$/.test(stock)) {
    throw new AppError("Las existencias deben ser un número entero mayor o igual a cero.", 400);
  }
  if (Number(stock) > STOCK_MAX) {
    throw new AppError(`Las existencias no pueden pasar de ${STOCK_MAX} unidades.`, 400);
  }

  const [categorias] = await pool.execute(
    "SELECT id_categoria FROM categorias WHERE id_categoria = ?",
    [categoria],
  );
  if (!categorias.length) {
    throw new AppError("La categoría no existe.", 400);
  }

  return { nombre, descripcion, categoria, precio: Math.round(Number(precio)), stock: Number(stock) };
}

/* RF-01: catálogo, solo productos activos. El administrador puede pedir también los inactivos.
   RF-03: categoria filtra por categoría. RF-04: orden = asc | desc ordena por precio.
   RF-20: q busca por nombre (panel del administrador). */
async function listProducts({ incluirInactivos = false, categoria, orden, q } = {}) {
  const where = [];
  const params = [];

  if (!incluirInactivos) {
    where.push("activo = 1");
  }

  const cat = texto(categoria);
  if (cat && cat !== "todas") {
    where.push("categoria = ?");
    params.push(cat);
  }

  const busqueda = texto(q).slice(0, 60);
  if (busqueda) {
    where.push("nombre LIKE ?");
    params.push(`%${escaparLike(busqueda)}%`);
  }

  const ordenSql = orden === "asc" || orden === "desc" ? ORDEN[orden] : ORDEN.ninguno;

  const [rows] = await pool.execute(
    `SELECT ${COLUMNS} FROM productos
     ${where.length ? "WHERE " + where.join(" AND ") : ""}
     ORDER BY ${ordenSql}`,
    params,
  );
  return rows.map(toProduct);
}

async function getProductById(id, { soloActivos = false } = {}) {
  const idProducto = enteroPositivo(id);
  if (!idProducto) {
    throw new AppError("Producto no disponible", 404);
  }

  const [rows] = await pool.execute(
    `SELECT ${COLUMNS} FROM productos WHERE id_producto = ? ${soloActivos ? "AND activo = 1" : ""}`,
    [idProducto],
  );

  if (!rows.length) {
    throw new AppError("Producto no disponible", 404);
  }

  return toProduct(rows[0]);
}

// RF-17
async function createProduct(data, imagen) {
  const producto = await validar(data);
  if (!imagen) {
    throw new AppError("Agregue una imagen del producto.", 400);
  }

  const [result] = await pool.execute(
    "INSERT INTO productos (nombre, descripcion, categoria, precio, stock, imagen) VALUES (?,?,?,?,?,?)",
    [producto.nombre, producto.descripcion, producto.categoria, producto.precio, producto.stock, imagen],
  );

  return getProductById(result.insertId);
}

// RF-18: editar datos, precio y existencias
async function updateProduct(id, data, imagen) {
  const actual = await getProductById(id);
  const producto = await validar(data);
  const nuevaImagen = imagen || actual.imagen;

  await pool.execute(
    "UPDATE productos SET nombre = ?, descripcion = ?, categoria = ?, precio = ?, stock = ?, imagen = ?, foto = ? WHERE id_producto = ?",
    [producto.nombre, producto.descripcion, producto.categoria, producto.precio, producto.stock, nuevaImagen, imagen ? null : actual.foto, actual.id_producto],
  );

  if (imagen && actual.imagen !== imagen) {
    await borrarImagenSiExiste(actual.imagen);
  }

  return getProductById(actual.id_producto);
}

// RF-19: los productos no se borran (tienen pedidos asociados), se inactivan
async function setProductActive(id, activo) {
  const actual = await getProductById(id);
  await pool.execute("UPDATE productos SET activo = ? WHERE id_producto = ?", [activo ? 1 : 0, actual.id_producto]);
  return getProductById(actual.id_producto);
}

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  setProductActive,
};

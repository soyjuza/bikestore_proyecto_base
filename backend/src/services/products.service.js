const fs = require("fs/promises");
const path = require("path");
const pool = require("../config/db");
const AppError = require("../utils/AppError");
const { UPLOAD_DIR } = require("../middlewares/upload.middleware");

const COLUMNS = "id_producto, nombre, descripcion, categoria, precio, stock, activo, imagen, foto";

function toProduct(row) {
  return { ...row, precio: Number(row.precio), activo: Boolean(row.activo) };
}

async function borrarImagenSiExiste(imagen) {
  // las imágenes de la demo están en el frontend (/img/...); solo se borran las subidas al servidor
  if (!imagen || imagen.startsWith("/")) return;

  try {
    await fs.unlink(path.join(UPLOAD_DIR, imagen));
  } catch {
    // si el archivo ya no existe en disco no es un error del usuario
  }
}

function validar({ nombre, descripcion, categoria, precio, stock }) {
  if (!nombre || !descripcion || !categoria || precio === undefined || precio === "" || stock === undefined || stock === "") {
    throw new AppError("Complete todos los campos.", 400);
  }
  if (!(Number(precio) > 0)) {
    throw new AppError("El precio debe ser mayor que cero.", 400);
  }
  if (!/^\d+$/.test(String(stock))) {
    throw new AppError("Las existencias deben ser un número entero mayor o igual a cero.", 400);
  }
}

// RF-01: catálogo (solo activos); el admin puede pedir todos
async function listProducts({ incluirInactivos = false } = {}) {
  const [rows] = await pool.execute(
    `SELECT ${COLUMNS} FROM productos ${incluirInactivos ? "" : "WHERE activo = 1"} ORDER BY id_producto`,
  );
  return rows.map(toProduct);
}

async function getProductById(id, { soloActivos = false } = {}) {
  const [rows] = await pool.execute(
    `SELECT ${COLUMNS} FROM productos WHERE id_producto = ? ${soloActivos ? "AND activo = 1" : ""}`,
    [id],
  );

  if (!rows.length) {
    throw new AppError("Producto no disponible", 404);
  }

  return toProduct(rows[0]);
}

// RF-17
async function createProduct(data, imagen) {
  validar(data);
  if (!imagen) {
    throw new AppError("Agregue una imagen del producto.", 400);
  }

  const [result] = await pool.execute(
    "INSERT INTO productos (nombre, descripcion, categoria, precio, stock, imagen) VALUES (?,?,?,?,?,?)",
    [data.nombre, data.descripcion, data.categoria, Math.round(Number(data.precio)), Number(data.stock), imagen],
  );

  return getProductById(result.insertId);
}

// RF-18, RF-19: editar datos, precio y existencias
async function updateProduct(id, data, imagen) {
  validar(data);
  const actual = await getProductById(id);
  const nuevaImagen = imagen || actual.imagen;

  await pool.execute(
    "UPDATE productos SET nombre = ?, descripcion = ?, categoria = ?, precio = ?, stock = ?, imagen = ?, foto = ? WHERE id_producto = ?",
    [data.nombre, data.descripcion, data.categoria, Math.round(Number(data.precio)), Number(data.stock), nuevaImagen, imagen ? null : actual.foto, id],
  );

  if (imagen && actual.imagen !== imagen) {
    await borrarImagenSiExiste(actual.imagen);
  }

  return getProductById(id);
}

// RF-20: los productos no se borran (tienen pedidos asociados), se inactivan
async function setProductActive(id, activo) {
  await getProductById(id);
  await pool.execute("UPDATE productos SET activo = ? WHERE id_producto = ?", [activo ? 1 : 0, id]);
  return getProductById(id);
}

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  setProductActive,
};

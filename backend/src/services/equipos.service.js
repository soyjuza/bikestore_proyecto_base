const fs = require("fs/promises");
const path = require("path");
const pool = require("../config/db");
const AppError = require("../utils/AppError");
const { UPLOAD_DIR } = require("../middlewares/upload.middleware");

async function borrarImagenSiExiste(imagen) {
  if (!imagen) return;

  try {
    await fs.unlink(path.join(UPLOAD_DIR, imagen));
  } catch {
    //si el archivo ya no exite en disco no es un error por parte del usuario
  }
}

async function listEquipos() {
  const [rows] = await pool.execute(
    "SELECT * FROM equipos ORDER BY id_equipo DESC",
  );
  return rows;
}

async function getEquipoById(id) {
  const [rows] = await pool.execute(
    "SELECT * FROM equipos WHERE id_equipo = ?",
    [id],
  );

  if (!rows.length) {
    throw new AppError("Equipo no encontrado", 404);
  }

  return rows[0];
}

async function createEquipo({ nombre, marca, modelo }, imagen) {
  if (!nombre) {
    throw new AppError("nombre es obligatorio", 400);
  }

  const [result] = await pool.execute(
    "INSERT INTO equipos (nombre, marca, modelo, imagen) VALUES (?,?,?,?)",
    [nombre, marca || null, modelo || null, imagen || null],
  );

  return getEquipoById(result.insertId);
}

async function updateEquipo(id, { nombre, marca, modelo }, imagen) {
  const actual = await getEquipoById(id);
  const nuevaImagen = imagen || actual.imagen;

  const [result] = await pool.execute(
    "UPDATE equipos SET nombre = ?, marca = ?, modelo = ?, imagen = ? WHERE id_equipo = ?",
    [nombre, marca || null, modelo || null, nuevaImagen, id],
  );

  if (!result.affectedRows) {
    throw new AppError("Equipo no encontrado", 404);
  }

  if (imagen && actual.imagen && actual.imagen !== imagen) {
    await borrarImagenSiExiste(actual.imagen);
  }
}

async function deleteEquipo(id) {
  const actual = await getEquipoById(id);

  const [result] = await pool.execute(
    "DELETE FROM equipos WHERE id_equipo = ?",
    [id],
  );

  if (!result.affectedRows) {
    throw new AppError("Equipo no encontrado", 404);
  }

  await borrarImagenSiExiste(actual.imagen);
}

module.exports = {
  listEquipos,
  getEquipoById,
  createEquipo,
  updateEquipo,
  deleteEquipo,
};

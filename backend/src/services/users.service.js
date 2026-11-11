const bcrypt = require("bcrypt");
const pool = require("../config/db");
const env = require("../config/env");
const AppError = require("../utils/AppError");
const { createToken } = require("../utils/jwt");
const { avisarCambioDeContrasena } = require("./auth.service");
const { texto, correo, esCorreo, validarPasswordSegura, enteroPositivo, escaparLike } = require("../utils/validar");

/* Usuarios. Nunca se devuelve la columna password.
   Formato: { id_usuario, nombre, email, rol, activo, created_at } */
const COLUMNS = "id_usuario, nombre, email, rol, activo, created_at";

function toUser(row) {
  return { ...row, activo: Boolean(row.activo) };
}

async function getUser(id) {
  const idUsuario = enteroPositivo(id);
  const [rows] = idUsuario
    ? await pool.execute(`SELECT ${COLUMNS} FROM usuarios WHERE id_usuario = ?`, [idUsuario])
    : [[]];

  if (!rows.length) {
    throw new AppError("Usuario no encontrado", 404);
  }

  return toUser(rows[0]);
}

// «Mis datos»: cada quien edita solo su nombre y su correo. El rol y el estado no se tocan aquí.
async function updateProfile(idUsuario, data) {
  const nombre = texto(data.nombre);
  const email = correo(data.email);

  if (!nombre || !email) {
    throw new AppError("Complete todos los campos.", 400);
  }
  if (!esCorreo(email)) {
    throw new AppError("Ingrese un correo electrónico válido.", 400);
  }
  if (nombre.length > 100) {
    throw new AppError("El nombre no puede tener más de 100 caracteres.", 400);
  }

  const [otros] = await pool.execute(
    "SELECT id_usuario FROM usuarios WHERE email = ? AND id_usuario <> ?",
    [email, idUsuario],
  );
  if (otros.length) {
    throw new AppError("Ese correo ya pertenece a otra cuenta.", 409);
  }

  try {
    await pool.execute(
      "UPDATE usuarios SET nombre = ?, email = ? WHERE id_usuario = ?",
      [nombre, email, idUsuario],
    );
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw new AppError("Ese correo ya pertenece a otra cuenta.", 409);
    }
    throw error;
  }

  return getUser(idUsuario);
}

// Para cambiar la contraseña hay que saber la actual. Devuelve un token nuevo
// porque el anterior deja de servir cuando cambia la contraseña.
async function changePassword(idUsuario, data) {
  const actual = typeof data.actual === "string" ? data.actual : "";
  const nueva = typeof data.nueva === "string" ? data.nueva : "";

  if (!actual || !nueva) {
    throw new AppError("Complete todos los campos.", 400);
  }

  const [rows] = await pool.execute(
    "SELECT id_usuario, rol, password FROM usuarios WHERE id_usuario = ?",
    [idUsuario],
  );
  const user = rows[0];

  if (!user || !(await bcrypt.compare(actual, user.password))) {
    throw new AppError("La contraseña actual no es correcta.", 400);
  }
  validarPasswordSegura(nueva);
  if (await bcrypt.compare(nueva, user.password)) {
    throw new AppError("La contraseña nueva debe ser distinta de la actual.", 400);
  }

  user.password = await bcrypt.hash(nueva, env.bcryptRounds);
  await pool.execute("UPDATE usuarios SET password = ? WHERE id_usuario = ?", [user.password, idUsuario]);
  avisarCambioDeContrasena(idUsuario); // sin await: no se espera a que el correo salga

  return { token: createToken(user) };
}

// RF-27: listado de usuarios. RF-31: q busca por nombre o correo.
async function listUsers({ q } = {}) {
  const busqueda = texto(q).slice(0, 60);

  if (!busqueda) {
    const [rows] = await pool.execute(`SELECT ${COLUMNS} FROM usuarios ORDER BY id_usuario`);
    return rows.map(toUser);
  }

  const patron = `%${escaparLike(busqueda)}%`;
  const [rows] = await pool.execute(
    `SELECT ${COLUMNS} FROM usuarios WHERE nombre LIKE ? OR email LIKE ? ORDER BY id_usuario`,
    [patron, patron],
  );
  return rows.map(toUser);
}

// RF-28: un administrador no puede cambiarse el rol a sí mismo (la tienda no se queda sin administrador)
async function setRole(idAdmin, id, rol) {
  if (rol !== "admin" && rol !== "cliente") {
    throw new AppError("El rol debe ser admin o cliente.", 400);
  }

  const user = await getUser(id);
  if (user.id_usuario === idAdmin) {
    throw new AppError("No puedes cambiar tu propio rol.", 400);
  }

  await pool.execute("UPDATE usuarios SET rol = ? WHERE id_usuario = ?", [rol, user.id_usuario]);
  return getUser(user.id_usuario);
}

// RF-29: una cuenta desactivada no puede iniciar sesión y sus tokens dejan de servir (auth.middleware)
async function setActive(idAdmin, id, activo) {
  const user = await getUser(id);
  if (user.id_usuario === idAdmin) {
    throw new AppError("No puedes desactivar tu propia cuenta.", 400);
  }

  await pool.execute("UPDATE usuarios SET activo = ? WHERE id_usuario = ?", [activo ? 1 : 0, user.id_usuario]);
  return getUser(user.id_usuario);
}

module.exports = { updateProfile, changePassword, listUsers, setRole, setActive };

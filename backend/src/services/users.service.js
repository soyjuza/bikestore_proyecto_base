const bcrypt = require("bcrypt");
const pool = require("../config/db");
const AppError = require("../utils/AppError");
const notImplemented = require("../utils/notImplemented");

/* Usuarios. Nunca devolver la columna password.
   Formato: { id_usuario, nombre, email, rol, activo, created_at }

   TODO updateProfile(idUsuario, { nombre, email }): validar, verificar que el email no sea de otra cuenta (409),
     UPDATE y devolver el usuario.
   TODO changePassword(idUsuario, { actual, nueva }): bcrypt.compare con la actual (400 si no coincide),
     nueva >= 8 caracteres, UPDATE con bcrypt.hash.
   TODO listUsers(): SELECT de todos los usuarios (RF-27).
   TODO setRole(idAdmin, id, rol): rol en ('admin','cliente'); un admin no puede cambiar su propio rol (RF-28).
   TODO setActive(idAdmin, id, activo): un admin no puede desactivarse a sí mismo (RF-29).
     Una cuenta desactivada no puede iniciar sesión (ya lo verifica auth.service.loginUser). */
async function updateProfile(idUsuario, data) {
  notImplemented("Actualizar mis datos");
}

async function changePassword(idUsuario, data) {
  notImplemented("Cambiar contraseña");
}

async function listUsers() {
  notImplemented("Listar usuarios");
}

async function setRole(idAdmin, id, rol) {
  notImplemented("Cambiar rol");
}

async function setActive(idAdmin, id, activo) {
  notImplemented("Activar o desactivar usuario");
}

module.exports = { updateProfile, changePassword, listUsers, setRole, setActive };

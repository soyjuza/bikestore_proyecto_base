const bcrypt = require("bcrypt");
const pool = require("../config/db");
const { createToken } = require("../utils/jwt");
const AppError = require("../utils/AppError");

async function registerUser({ nombre, email, password }) {
  if (!nombre || !email || !password) {
    throw new AppError("nombre, email y password son obligatorios", 400);
  }

  const [existing] = await pool.execute(
    "SELECT id_usuario FROM usuarios WHERE email = ?",
    [email],
  );

  if (existing.length) {
    throw new AppError("El correo ya esta registrado", 409);
  }

  const hash = await bcrypt.hash(password, 10);

  const [result] = await pool.execute(
    "INSERT INTO usuarios (nombre, email, password, rol) VALUES (?,?,?,?)",
    [nombre, email, hash, "cliente"],
  );

  return { id_usuario: result.insertId };
}

async function loginUser({ email, password }) {
  if (!email || !password) {
    throw new AppError("email y password son obligatorios", 400);
  }

  const [rows] = await pool.execute(
    "SELECT id_usuario, nombre, email, password, rol FROM usuarios WHERE email = ?",
    [email],
  );
  if (!rows.length) {
    throw new AppError("Credenciales incorrectas", 401);
  }

  const user = rows[0];
  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    throw new AppError("Credenciales incorrectas", 401);
  }

  delete user.password;

  return { user, token: createToken(user) };
}

module.exports = { registerUser, loginUser };

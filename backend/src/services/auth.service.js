const bcrypt = require("bcrypt");
const pool = require("../config/db");
const { createToken } = require("../utils/jwt");
const AppError = require("../utils/AppError");
const notImplemented = require("../utils/notImplemented");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// RF-13, RF-14: los clientes se registran solos; el rol siempre es «cliente». Contraseña con bcrypt (RNF-05).
async function registerUser({ nombre, email, password }) {
  if (!nombre || !email || !password) {
    throw new AppError("Complete todos los campos.", 400);
  }
  if (password.length < 8) {
    throw new AppError("La contraseña debe tener al menos 8 caracteres.", 400);
  }
  if (!EMAIL_RE.test(email)) {
    throw new AppError("Ingrese un correo electrónico válido.", 400);
  }

  const [existing] = await pool.execute(
    "SELECT id_usuario FROM usuarios WHERE email = ?",
    [email],
  );

  if (existing.length) {
    throw new AppError("Este correo ya tiene una cuenta.", 409);
  }

  const hash = await bcrypt.hash(password, 10);

  const [result] = await pool.execute(
    "INSERT INTO usuarios (nombre, email, password, rol) VALUES (?,?,?,?)",
    [nombre, email, hash, "cliente"],
  );

  return { id_usuario: result.insertId };
}

// RF-15
async function loginUser({ email, password }) {
  if (!email || !password) {
    throw new AppError("Complete todos los campos.", 400);
  }

  const [rows] = await pool.execute(
    "SELECT id_usuario, nombre, email, password, rol, activo, created_at FROM usuarios WHERE email = ?",
    [email],
  );
  if (!rows.length) {
    throw new AppError("Correo o contraseña incorrectos.", 401);
  }

  const user = rows[0];
  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    throw new AppError("Correo o contraseña incorrectos.", 401);
  }

  if (!user.activo) {
    throw new AppError("Su cuenta está desactivada. Comuníquese con el administrador de la tienda.", 403);
  }

  delete user.password;
  user.activo = Boolean(user.activo);

  return { user, token: createToken(user) };
}

/* RF-16: recuperar contraseña.
   TODO requestPasswordReset(email):
     1. Buscar el usuario por email (404 si no existe).
     2. Generar un token aleatorio: crypto.randomBytes(32).toString('hex').
     3. INSERT INTO recuperaciones (id_usuario, token, expira) con expira = NOW() + 30 minutos.
     4. Enviar al correo el enlace `${env.frontendUrl}/recuperar?token=${token}` (nodemailer).
   TODO checkResetToken(token): SELECT de recuperaciones con usado = 0 AND expira > NOW(); si no hay fila -> AppError 410.
   TODO resetPassword(token, password): validar igual que checkResetToken, password >= 8,
     UPDATE usuarios SET password = bcrypt.hash(...) y marcar la recuperación como usada (en una transacción). */
async function requestPasswordReset(email) {
  notImplemented("Recuperar contraseña");
}

async function checkResetToken(token) {
  notImplemented("Validar enlace de recuperación");
}

async function resetPassword(token, password) {
  notImplemented("Restablecer contraseña");
}

module.exports = { registerUser, loginUser, requestPasswordReset, checkResetToken, resetPassword };

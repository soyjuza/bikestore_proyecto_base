const crypto = require("crypto");
const bcrypt = require("bcrypt");
const pool = require("../config/db");
const env = require("../config/env");
const mailer = require("../utils/mailer");
const { createToken } = require("../utils/jwt");
const AppError = require("../utils/AppError");
const { texto, correo, esCorreo, esPassword } = require("../utils/validar");

const MINUTOS_ENLACE = 30;
const ENLACE_INVALIDO = "El enlace ya no es válido. Solicite uno nuevo.";

// Hash de relleno para comparar cuando el correo no existe: así el inicio de sesión tarda lo mismo
// con un correo registrado que con uno inventado y no se puede saber cuál existe midiendo el tiempo.
const HASH_RELLENO = bcrypt.hashSync("no-es-una-cuenta", env.bcryptRounds);

// En la base de datos no se guarda el token del enlace sino su hash.
// Si alguien llegara a leer la tabla, no podría usar los enlaces pendientes.
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// RF-13, RF-14: los clientes se registran solos; el rol siempre es «cliente». Contraseña con bcrypt (RNF-05).
async function registerUser(data) {
  const nombre = texto(data.nombre);
  const email = correo(data.email);
  const password = typeof data.password === "string" ? data.password : "";

  if (!nombre || !email || !password) {
    throw new AppError("Complete todos los campos.", 400);
  }
  if (password.length < 8) {
    throw new AppError("La contraseña debe tener al menos 8 caracteres.", 400);
  }
  if (!esPassword(password)) {
    throw new AppError("La contraseña es demasiado larga.", 400);
  }
  if (!esCorreo(email)) {
    throw new AppError("Ingrese un correo electrónico válido.", 400);
  }
  if (nombre.length > 100) {
    throw new AppError("El nombre no puede tener más de 100 caracteres.", 400);
  }

  const [existing] = await pool.execute(
    "SELECT id_usuario FROM usuarios WHERE email = ?",
    [email],
  );

  if (existing.length) {
    throw new AppError("Este correo ya tiene una cuenta. Inicie sesión o recupere su contraseña.", 409);
  }

  const hash = await bcrypt.hash(password, env.bcryptRounds);

  try {
    const [result] = await pool.execute(
      "INSERT INTO usuarios (nombre, email, password, rol) VALUES (?,?,?,?)",
      [nombre, email, hash, "cliente"],
    );
    return { id_usuario: result.insertId };
  } catch (error) {
    // dos registros con el mismo correo al mismo tiempo: el segundo choca con el UNIQUE
    if (error.code === "ER_DUP_ENTRY") {
      throw new AppError("Este correo ya tiene una cuenta. Inicie sesión o recupere su contraseña.", 409);
    }
    throw error;
  }
}

// RF-15
async function loginUser(data) {
  const email = correo(data.email);
  const password = typeof data.password === "string" ? data.password : "";

  if (!email || !password) {
    throw new AppError("Complete todos los campos.", 400);
  }

  const [rows] = await pool.execute(
    "SELECT id_usuario, nombre, email, password, rol, activo, created_at FROM usuarios WHERE email = ?",
    [email],
  );

  const user = rows[0];
  const valid = await bcrypt.compare(password, user ? user.password : HASH_RELLENO);

  // el mismo mensaje para correo o contraseña equivocados: no se dice cuál de los dos falló
  if (!user || !valid) {
    throw new AppError("Correo o contraseña incorrectos.", 401);
  }

  if (!user.activo) {
    throw new AppError("Su cuenta está desactivada. Comuníquese con el administrador de la tienda.", 403);
  }

  const token = createToken(user);

  delete user.password;
  user.activo = Boolean(user.activo);

  return { user, token };
}

// RF-16: se envía al correo un enlace con un token de un solo uso que dura 30 minutos
async function requestPasswordReset(emailRecibido) {
  const email = correo(emailRecibido);

  if (!email) {
    throw new AppError("Ingrese su correo electrónico.", 400);
  }
  if (!esCorreo(email)) {
    throw new AppError("Ingrese un correo electrónico válido.", 400);
  }

  const [rows] = await pool.execute(
    "SELECT id_usuario, nombre, activo FROM usuarios WHERE email = ?",
    [email],
  );
  const user = rows[0];

  if (!user) {
    throw new AppError("No hay una cuenta registrada con ese correo.", 404);
  }
  if (!user.activo) {
    throw new AppError("Su cuenta está desactivada. Comuníquese con el administrador de la tienda.", 403);
  }

  const token = crypto.randomBytes(32).toString("hex");

  // si había un enlace anterior sin usar, deja de servir: solo vale el último
  await pool.execute(
    "UPDATE recuperaciones SET usado = 1 WHERE id_usuario = ? AND usado = 0",
    [user.id_usuario],
  );
  await pool.execute(
    `INSERT INTO recuperaciones (id_usuario, token, expira) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ${MINUTOS_ENLACE} MINUTE))`,
    [user.id_usuario, hashToken(token)],
  );

  const enlace = `${env.frontendUrl}/recuperar?token=${token}`;

  try {
    await mailer.enviarCorreo({
      para: email,
      asunto: "BikeStore: recupera tu contraseña",
      texto:
        `Hola, ${user.nombre}.\n\n` +
        `Recibimos una solicitud para cambiar la contraseña de tu cuenta de BikeStore. ` +
        `Abre este enlace para crear una contraseña nueva:\n\n${enlace}\n\n` +
        `El enlace dura ${MINUTOS_ENLACE} minutos y solo sirve una vez. ` +
        `Si no fuiste tú, ignora este correo: tu contraseña sigue siendo la misma.`,
    });
  } catch (error) {
    console.error("No se pudo enviar el correo de recuperación:", error.message);
    throw new AppError("No se pudo enviar el correo. Intente de nuevo más tarde.", 502);
  }
}

// Busca la recuperación vigente de un token. conn puede ser el pool o una conexión con transacción.
async function buscarRecuperacion(conn, token, bloquear = false) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
    throw new AppError(ENLACE_INVALIDO, 410);
  }

  const [rows] = await conn.execute(
    `SELECT id_recuperacion, id_usuario FROM recuperaciones
      WHERE token = ? AND usado = 0 AND expira > NOW() ${bloquear ? "FOR UPDATE" : ""}`,
    [hashToken(token)],
  );

  if (!rows.length) {
    throw new AppError(ENLACE_INVALIDO, 410);
  }

  return rows[0];
}

async function checkResetToken(token) {
  await buscarRecuperacion(pool, token);
}

async function resetPassword(token, password) {
  if (typeof password !== "string" || password.length < 8) {
    throw new AppError("La contraseña debe tener al menos 8 caracteres.", 400);
  }
  if (!esPassword(password)) {
    throw new AppError("La contraseña es demasiado larga.", 400);
  }

  const hash = await bcrypt.hash(password, env.bcryptRounds);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const recuperacion = await buscarRecuperacion(conn, token, true);

    await conn.execute(
      "UPDATE usuarios SET password = ? WHERE id_usuario = ?",
      [hash, recuperacion.id_usuario],
    );
    // se gastan todos los enlaces del usuario, no solo este
    await conn.execute(
      "UPDATE recuperaciones SET usado = 1 WHERE id_usuario = ?",
      [recuperacion.id_usuario],
    );

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

module.exports = { registerUser, loginUser, requestPasswordReset, checkResetToken, resetPassword };

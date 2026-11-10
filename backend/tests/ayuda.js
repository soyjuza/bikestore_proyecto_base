// Preparación común de las pruebas. Cada archivo de prueba lo carga antes que nada.
process.env.NODE_ENV = "test";

// bcrypt con pocas rondas para que las pruebas no tarden, y límites altos
// para que no se bloqueen entre ellas (limites.test.js pone los suyos).
process.env.BCRYPT_ROUNDS ??= "4";
process.env.LIMITE_GENERAL ??= "100000";
process.env.LIMITE_LOGIN ??= "100000";
process.env.LIMITE_CUENTA ??= "100000";

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const request = require("supertest");

const env = require("../src/config/env");

if (!env.db.database.endsWith("_test")) {
  throw new Error(`Las pruebas borran la base de datos: DB_NAME debe terminar en _test (ahora es ${env.db.database})`);
}

const app = require("../src/app");
const pool = require("../src/config/db");
const mailer = require("../src/utils/mailer");

// Los correos no se envían: quedan en esta lista para poder leer el enlace de recuperación
const correos = [];
mailer.enviarCorreo = async (correo) => {
  correos.push(correo);
};

// Deja la base de datos de pruebas recién creada, con los 17 productos de sql/bikestore.sql
async function reiniciarBD() {
  const script = fs
    .readFileSync(path.join(__dirname, "..", "..", "sql", "bikestore.sql"), "utf8")
    .replace(/CREATE DATABASE[\s\S]*?;/, "")
    .replace(/USE bikestore;/, "");

  const conn = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: true,
  });
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${env.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await conn.query(`USE \`${env.db.database}\``);
  await conn.query(script);
  await conn.end();
}

async function crearUsuario({ nombre = "Laura Gómez", email, password = "clave12345", rol = "cliente", activo = 1 }) {
  const hash = await bcrypt.hash(password, 4);
  const [result] = await pool.execute(
    "INSERT INTO usuarios (nombre, email, password, rol, activo) VALUES (?,?,?,?,?)",
    [nombre, email, hash, rol, activo],
  );
  return result.insertId;
}

async function iniciarSesion(email, password = "clave12345") {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  if (res.status !== 200) {
    throw new Error(`No se pudo iniciar sesión con ${email}: ${res.status}`);
  }
  return res.body.token;
}

// crea la cuenta y devuelve su id y su token
async function usuarioConSesion(datos) {
  const id = await crearUsuario(datos);
  const token = await iniciarSesion(datos.email, datos.password);
  return { id, token };
}

function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}

async function cerrar() {
  await pool.end();
}

module.exports = { app, pool, request, correos, reiniciarBD, crearUsuario, iniciarSesion, usuarioConSesion, bearer, cerrar };

const mysql = require("mysql2/promise");
const env = require("./env");

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  charset: "utf8mb4",
  waitForConnections: true,
  connectionLimit: 10,
  // las fechas llegan como texto (2026-11-10 14:30:00) y así no se corren de día al pasarlas a JSON
  dateStrings: true,
  // los DECIMAL (precio, total) llegan como número
  decimalNumbers: true,
});

// Las fechas (pedidos, registro de usuarios) se manejan con la hora de Colombia
// aunque el servidor de MySQL esté configurado en otra zona horaria.
pool.pool.on("connection", (conn) => {
  conn.query("SET time_zone = '-05:00'");
});

module.exports = pool;

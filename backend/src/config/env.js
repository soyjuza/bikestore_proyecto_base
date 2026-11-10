const path = require("path");

// Las pruebas usan su propio archivo (.env.test) para no tocar la base de datos de desarrollo
const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
require("dotenv").config({ path: path.join(__dirname, "..", "..", envFile), quiet: true });

const required = ["DB_HOST", "DB_USER", "DB_NAME", "JWT_SECRET"];

for (const name of required) {
  if (!process.env[name]) {
    throw new Error(`Falta la variable de entorno: ${name}`);
  }
}

const nodeEnv = process.env.NODE_ENV || "development";
const jwtSecret = process.env.JWT_SECRET;

// Con una clave corta o con la del ejemplo cualquiera podría fabricar un token de administrador
const claveDebil = jwtSecret.length < 32 || jwtSecret === "cambia-esta-clave";
if (claveDebil && nodeEnv === "production") {
  throw new Error("JWT_SECRET debe tener al menos 32 caracteres y no puede ser la clave del ejemplo");
}
if (claveDebil && nodeEnv === "development") {
  console.warn("Aviso: JWT_SECRET es muy corta. Cámbiela antes de desplegar (mínimo 32 caracteres).");
}

const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

module.exports = {
  nodeEnv,
  port: Number(process.env.PORT || 3000),
  frontendUrl,
  // orígenes que pueden llamar a la API desde el navegador (separados por coma)
  corsOrigins: (process.env.CORS_ORIGINS || frontendUrl)
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean),
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME,
  },
  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || "2h",
  },
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 10),
  // límites de peticiones por IP
  limites: {
    general: Number(process.env.LIMITE_GENERAL || 300),      // por minuto, toda la API
    login: Number(process.env.LIMITE_LOGIN || 10),           // intentos fallidos cada 15 minutos
    cuenta: Number(process.env.LIMITE_CUENTA || 20),         // registro y recuperación, cada 15 minutos
  },
  mail: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.MAIL_FROM || "BikeStore <no-responder@bikestore.co>",
  },
  admin: {
    name: process.env.ADMIN_NAME,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  },
};

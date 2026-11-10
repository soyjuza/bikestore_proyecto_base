const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const env = require("../config/env");

// Parte del hash de la contraseña que viaja en el token. Si la contraseña cambia,
// la huella ya no coincide y los tokens viejos dejan de servir (ver auth.middleware).
function huella(passwordHash) {
  return crypto.createHash("sha256").update(passwordHash).digest("hex").slice(0, 16);
}

// user debe traer la columna password (el hash), solo se usa para sacar la huella
function createToken(user) {
  return jwt.sign(
    {
      id_usuario: user.id_usuario,
      rol: user.rol,
      huella: huella(user.password),
    },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn, algorithm: "HS256" },
  );
}

function verifyToken(token) {
  return jwt.verify(token, env.jwt.secret, { algorithms: ["HS256"] });
}

module.exports = { createToken, verifyToken, huella };

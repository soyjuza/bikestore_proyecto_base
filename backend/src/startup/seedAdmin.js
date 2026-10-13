const bcrypt = require("bcrypt");
const pool = require("../config/db");
const env = require("../config/env");

async function seedAdmin() {
  const { name, email, password } = env.admin;

  if (!name || !email || !password) {
    console.log(
      "Seed admin omitido: ADMIN_NAME/ADMIN_EMAIL/ADMIN_PASSWORD no configurados",
    );
    return;
  }

  const [existing] = await pool.execute(
    'SELECT id_usuario FROM usuarios WHERE email = ?',
    [email],
  );

  if (existing.length) {
    console.log('Seed de admin omitido: ya existe un usuario con ese email');
    return;
  }

  const hash = await bcrypt.hash(password, 10);

  await pool.execute(
    "INSERT INTO usuarios (nombre, email, password, rol) VALUES (?,?,?,?)",
    [name, email, hash, "admin"],
  );

  console.log(`Usuario admin creado: ${email}`);
}

module.exports = seedAdmin;

// Límite de intentos por IP. Va en un archivo aparte porque necesita los límites bajos.
process.env.LIMITE_LOGIN = "5";
process.env.LIMITE_CUENTA = "3";

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { app, request, reiniciarBD, crearUsuario, cerrar } = require("./ayuda");

before(async () => {
  await reiniciarBD();
  await crearUsuario({ email: "victima@correo.com", password: "claveDificil1" });
});

after(cerrar);

test("los inicios de sesión correctos no gastan intentos", async () => {
  for (let i = 0; i < 8; i++) {
    const res = await request(app).post("/api/auth/login").send({ email: "victima@correo.com", password: "claveDificil1" });
    assert.equal(res.status, 200);
  }
});

test("después de 5 contraseñas equivocadas se bloquea la IP, incluso con la contraseña correcta", async () => {
  for (let i = 1; i <= 5; i++) {
    const res = await request(app).post("/api/auth/login").send({ email: "victima@correo.com", password: `intento${i}` });
    assert.equal(res.status, 401, `intento ${i}`);
  }

  const sexto = await request(app).post("/api/auth/login").send({ email: "victima@correo.com", password: "intento6" });
  assert.equal(sexto.status, 429);
  assert.equal(sexto.body.message, "Demasiados intentos de inicio de sesión. Espere 15 minutos e intente de nuevo.");

  const correcta = await request(app).post("/api/auth/login").send({ email: "victima@correo.com", password: "claveDificil1" });
  assert.equal(correcta.status, 429);
  assert.equal(correcta.body.token, undefined);
});

test("no se pueden pedir enlaces de recuperación sin parar", async () => {
  for (let i = 1; i <= 3; i++) {
    const res = await request(app).post("/api/auth/recover").send({ email: "victima@correo.com" });
    assert.equal(res.status, 200, `solicitud ${i}`);
  }
  const res = await request(app).post("/api/auth/recover").send({ email: "victima@correo.com" });
  assert.equal(res.status, 429);
});

// Registro, inicio de sesión y recuperación de contraseña (HU05, HU06 y HU22)
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { app, pool, request, correos, tokenDelCorreo, esperarCorreo, reiniciarBD, crearUsuario, cerrar } = require("./ayuda");
const env = require("../src/config/env");

before(reiniciarBD);
after(cerrar);

const DEBIL = "La contraseña debe tener al menos 8 caracteres, con una mayúscula, una minúscula, un número y un carácter especial.";

describe("HU05 Registrar usuario", () => {
  const datos = { nombre: "Camila Torres", email: "camila@correo.com", password: "Bicicleta2026*" };

  test("registro exitoso: crea la cuenta con rol cliente", async () => {
    const res = await request(app).post("/api/auth/register").send(datos);
    assert.equal(res.status, 201);
    assert.ok(res.body.id_usuario);

    const [[user]] = await pool.execute("SELECT rol, activo FROM usuarios WHERE email = ?", [datos.email]);
    assert.equal(user.rol, "cliente");
    assert.equal(user.activo, 1);
  });

  test("correo con formato inválido", async () => {
    const res = await request(app).post("/api/auth/register").send({ ...datos, email: "camila.correo.com" });
    assert.equal(res.status, 400);
    assert.equal(res.body.message, "Ingrese un correo electrónico válido.");
  });

  test("correo ya registrado, aunque lo escriban en mayúsculas", async () => {
    const res = await request(app).post("/api/auth/register").send({ ...datos, email: "CAMILA@correo.com" });
    assert.equal(res.status, 409);
    assert.equal(res.body.message, "Este correo ya tiene una cuenta. Inicie sesión o recupere su contraseña.");
  });

  test("contraseña de menos de 8 caracteres", async () => {
    const res = await request(app).post("/api/auth/register").send({ ...datos, email: "otra@correo.com", password: "Co1*" });
    assert.equal(res.status, 400);
    assert.equal(res.body.message, DEBIL);
  });

  test("campos vacíos", async () => {
    const res = await request(app).post("/api/auth/register").send({ nombre: "  ", email: "", password: "" });
    assert.equal(res.status, 400);
    assert.equal(res.body.message, "Complete todos los campos.");
  });
});

describe("HU06 Iniciar sesión", () => {
  before(async () => {
    await crearUsuario({ nombre: "Andrés Mejía", email: "andres@correo.com" });
    await crearUsuario({ nombre: "Admin Tienda", email: "admin@bikestore.co", rol: "admin" });
    await crearUsuario({ email: "inactiva@correo.com", activo: 0 });
  });

  test("el cliente inicia sesión y recibe su token", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "andres@correo.com", password: "clave12345" });
    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    assert.equal(res.body.user.rol, "cliente");
    assert.equal(res.body.user.nombre, "Andrés Mejía");
  });

  test("el administrador inicia sesión con rol admin", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "admin@bikestore.co", password: "clave12345" });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.rol, "admin");
  });

  test("contraseña equivocada y correo que no existe dan el mismo mensaje", async () => {
    const mala = await request(app).post("/api/auth/login").send({ email: "andres@correo.com", password: "noeslaclave" });
    const noExiste = await request(app).post("/api/auth/login").send({ email: "nadie@correo.com", password: "clave12345" });

    assert.equal(mala.status, 401);
    assert.equal(noExiste.status, 401);
    assert.equal(mala.body.message, "Correo o contraseña incorrectos.");
    assert.equal(noExiste.body.message, mala.body.message);
  });

  test("una cuenta desactivada no entra", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "inactiva@correo.com", password: "clave12345" });
    assert.equal(res.status, 403);
    assert.equal(res.body.token, undefined);
  });

  test("campos vacíos", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "andres@correo.com" });
    assert.equal(res.status, 400);
  });
});

describe("HU22 Recuperar contraseña", () => {
  before(async () => {
    await crearUsuario({ nombre: "Sofía Rincón", email: "sofia@correo.com", password: "claveVieja1" });
  });

  test("envía el enlace al correo de una cuenta que existe", async () => {
    const res = await request(app).post("/api/auth/recover").send({ email: "sofia@correo.com" });
    assert.equal(res.status, 200);
    assert.equal(res.body.message, "Le enviamos un enlace a su correo para recuperar la contraseña.");
    assert.equal(correos.at(-1).para, "sofia@correo.com");
    // el token va después de # para que no quede en los registros de ningún servidor
    assert.match(correos.at(-1).texto, /\/recuperar#token=[a-f0-9]{64}/);
    assert.match(correos.at(-1).html, /cid:logo-bikestore/);
    assert.equal(correos.at(-1).adjuntos[0].cid, "logo-bikestore");
    // el token solo va en el correo, nunca en la respuesta
    assert.equal(res.body.token, undefined);
  });

  test("correo sin cuenta: no envía nada", async () => {
    const antes = correos.length;
    const res = await request(app).post("/api/auth/recover").send({ email: "nadie@correo.com" });
    assert.equal(res.status, 404);
    assert.equal(res.body.message, "No hay una cuenta registrada con ese correo.");
    assert.equal(correos.length, antes);
  });

  test("el enlace abre mientras está vigente", async () => {
    const res = await request(app).get(`/api/auth/reset/${tokenDelCorreo()}`);
    assert.equal(res.status, 200);
  });

  test("contraseña nueva muy corta: no cambia nada y el enlace sigue sirviendo", async () => {
    const token = tokenDelCorreo();
    const res = await request(app).post("/api/auth/reset").send({ token, password: "corta" });
    assert.equal(res.status, 400);
    assert.equal((await request(app).get(`/api/auth/reset/${token}`)).status, 200);
  });

  test("contraseña nueva sin mayúscula, número o carácter especial: no cambia nada", async () => {
    const token = tokenDelCorreo();
    for (const debil of ["clavenueva2*", "CLAVENUEVA2*", "ClaveNueva*", "ClaveNueva2"]) {
      const res = await request(app).post("/api/auth/reset").send({ token, password: debil });
      assert.equal(res.status, 400, debil);
      assert.equal(res.body.message, DEBIL);
    }
    assert.equal((await request(app).get(`/api/auth/reset/${token}`)).status, 200);
  });

  test("cambio exitoso: entra con la nueva y la vieja deja de servir", async () => {
    const token = tokenDelCorreo();
    const res = await request(app).post("/api/auth/reset").send({ token, password: "ClaveNueva2*" });
    assert.equal(res.status, 200);
    assert.equal(res.body.message, "Su contraseña fue actualizada.");

    // llega el aviso de que la contraseña cambió, sin ningún enlace de recuperación
    const aviso = await esperarCorreo("Tu contraseña de BikeStore fue cambiada", "sofia@correo.com");
    assert.doesNotMatch(aviso.texto, /token=/);

    const nueva = await request(app).post("/api/auth/login").send({ email: "sofia@correo.com", password: "ClaveNueva2*" });
    const vieja = await request(app).post("/api/auth/login").send({ email: "sofia@correo.com", password: "claveVieja1" });
    assert.equal(nueva.status, 200);
    assert.equal(vieja.status, 401);
  });

  test("el enlace sirve una sola vez", async () => {
    const token = tokenDelCorreo();
    const abrir = await request(app).get(`/api/auth/reset/${token}`);
    const usar = await request(app).post("/api/auth/reset").send({ token, password: "OtraClave33*" });
    assert.equal(abrir.status, 410);
    assert.equal(usar.status, 410);
    assert.equal(abrir.body.message, "El enlace ya no es válido. Solicite uno nuevo.");
  });

  test("el enlace vence a los 30 minutos", async () => {
    await request(app).post("/api/auth/recover").send({ email: "sofia@correo.com" });
    const token = tokenDelCorreo();
    await pool.execute("UPDATE recuperaciones SET expira = DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE usado = 0");

    const res = await request(app).post("/api/auth/reset").send({ token, password: "OtraClave33*" });
    assert.equal(res.status, 410);
  });

  test("al pedir un enlace nuevo, el anterior deja de servir", async () => {
    await request(app).post("/api/auth/recover").send({ email: "sofia@correo.com" });
    const primero = tokenDelCorreo();
    await request(app).post("/api/auth/recover").send({ email: "sofia@correo.com" });
    const segundo = tokenDelCorreo();

    assert.equal((await request(app).get(`/api/auth/reset/${primero}`)).status, 410);
    assert.equal((await request(app).get(`/api/auth/reset/${segundo}`)).status, 200);
  });

  test("un mismo correo no puede pedir más de 3 enlaces cada 15 minutos", async () => {
    const limite = env.limites.correo;
    env.limites.correo = 3;
    try {
      await crearUsuario({ nombre: "Pedro Ríos", email: "pedro@correo.com", password: "claveVieja1" });
      for (let i = 1; i <= 3; i++) {
        const res = await request(app).post("/api/auth/recover").send({ email: "pedro@correo.com" });
        assert.equal(res.status, 200, `solicitud ${i}`);
      }
      const antes = correos.length;
      const cuarta = await request(app).post("/api/auth/recover").send({ email: "pedro@correo.com" });
      assert.equal(cuarta.status, 429);
      assert.equal(correos.length, antes);
    } finally {
      env.limites.correo = limite;
    }
  });

  test("el nombre con HTML no se interpreta dentro del correo", async () => {
    await crearUsuario({ nombre: '<img src=x onerror="alert(1)">', email: "html@correo.com", password: "claveVieja1" });
    await request(app).post("/api/auth/recover").send({ email: "html@correo.com" });
    assert.doesNotMatch(correos.at(-1).html, /<img src=x/);
    assert.match(correos.at(-1).html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  });
});

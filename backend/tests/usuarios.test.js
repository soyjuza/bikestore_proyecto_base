// Cuenta propia (mis datos, contraseña) y administración de usuarios (RF-27 a RF-31)
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { app, request, esperarCorreo, reiniciarBD, crearUsuario, usuarioConSesion, iniciarSesion, bearer, cerrar } = require("./ayuda");

let admin;
let marta;
let idPedro;

before(async () => {
  await reiniciarBD();
  admin = await usuarioConSesion({ nombre: "Admin Tienda", email: "admin@bikestore.co", rol: "admin" });
  marta = await usuarioConSesion({ nombre: "Marta Lozano", email: "marta@correo.com" });
  idPedro = await crearUsuario({ nombre: "Pedro Castaño", email: "pedro@correo.com" });
});

after(cerrar);

describe("Mis datos", () => {
  test("actualiza nombre y correo", async () => {
    const res = await request(app).put("/api/users/me").set(bearer(marta.token))
      .send({ nombre: "Marta Lozano Ruiz", email: "marta.lozano@correo.com" });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.nombre, "Marta Lozano Ruiz");
    assert.equal(res.body.data.email, "marta.lozano@correo.com");
    assert.equal(res.body.data.password, undefined);
  });

  test("no deja usar el correo de otra cuenta", async () => {
    const res = await request(app).put("/api/users/me").set(bearer(marta.token))
      .send({ nombre: "Marta", email: "pedro@correo.com" });
    assert.equal(res.status, 409);
    assert.equal(res.body.message, "Ese correo ya pertenece a otra cuenta.");
  });

  test("valida el formato del correo", async () => {
    const res = await request(app).put("/api/users/me").set(bearer(marta.token)).send({ nombre: "Marta", email: "marta" });
    assert.equal(res.status, 400);
  });
});

describe("Cambiar contraseña", () => {
  test("pide la contraseña actual", async () => {
    const res = await request(app).put("/api/users/me/password").set(bearer(marta.token))
      .send({ actual: "noeslaclave", nueva: "NuevaClave99*" });
    assert.equal(res.status, 400);
    assert.equal(res.body.message, "La contraseña actual no es correcta.");
  });

  test("la nueva debe tener al menos 8 caracteres", async () => {
    const res = await request(app).put("/api/users/me/password").set(bearer(marta.token))
      .send({ actual: "clave12345", nueva: "corta" });
    assert.equal(res.status, 400);
  });

  test("la nueva debe ser segura: mayúscula, minúscula, número y carácter especial", async () => {
    const res = await request(app).put("/api/users/me/password").set(bearer(marta.token))
      .send({ actual: "clave12345", nueva: "clave123456" });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /una mayúscula, una minúscula, un número y un carácter especial/);
  });

  test("cambia la contraseña y entrega un token nuevo", async () => {
    const res = await request(app).put("/api/users/me/password").set(bearer(marta.token))
      .send({ actual: "clave12345", nueva: "NuevaClave99*" });
    assert.equal(res.status, 200);
    assert.ok(res.body.token);

    const conNuevo = await request(app).get("/api/cart").set(bearer(res.body.token));
    assert.equal(conNuevo.status, 200);
    await iniciarSesion("marta.lozano@correo.com", "NuevaClave99*");
    marta.token = res.body.token;

    // y le llega el aviso de que su contraseña cambió
    await esperarCorreo("Tu contraseña de BikeStore fue cambiada", "marta.lozano@correo.com");
  });
});

describe("Administración de usuarios", () => {
  test("RF-27: lista los usuarios sin la contraseña", async () => {
    const res = await request(app).get("/api/users").set(bearer(admin.token));
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 3);
    assert.deepEqual(Object.keys(res.body.data[0]).sort(), ["activo", "created_at", "email", "id_usuario", "nombre", "rol"]);
  });

  test("RF-31: busca por nombre o por correo", async () => {
    const porNombre = await request(app).get("/api/users?q=casta").set(bearer(admin.token));
    const porCorreo = await request(app).get("/api/users?q=bikestore.co").set(bearer(admin.token));
    const sinResultado = await request(app).get("/api/users?q=%25").set(bearer(admin.token)); // un % suelto no trae todo

    assert.deepEqual(porNombre.body.data.map((u) => u.email), ["pedro@correo.com"]);
    assert.deepEqual(porCorreo.body.data.map((u) => u.email), ["admin@bikestore.co"]);
    assert.deepEqual(sinResultado.body.data, []);
  });

  test("RF-28: asigna el rol de administrador y lo vuelve a quitar", async () => {
    const subir = await request(app).patch(`/api/users/${idPedro}/rol`).set(bearer(admin.token)).send({ rol: "admin" });
    assert.equal(subir.body.data.rol, "admin");

    const bajar = await request(app).patch(`/api/users/${idPedro}/rol`).set(bearer(admin.token)).send({ rol: "cliente" });
    assert.equal(bajar.body.data.rol, "cliente");
  });

  test("no acepta roles inventados", async () => {
    const res = await request(app).patch(`/api/users/${idPedro}/rol`).set(bearer(admin.token)).send({ rol: "superadmin" });
    assert.equal(res.status, 400);
  });

  test("un administrador no se puede cambiar su propio rol ni desactivarse", async () => {
    const rol = await request(app).patch(`/api/users/${admin.id}/rol`).set(bearer(admin.token)).send({ rol: "cliente" });
    const estado = await request(app).patch(`/api/users/${admin.id}/estado`).set(bearer(admin.token)).send({ activo: false });

    assert.equal(rol.status, 400);
    assert.equal(rol.body.message, "No puedes cambiar tu propio rol.");
    assert.equal(estado.status, 400);
    assert.equal(estado.body.message, "No puedes desactivar tu propia cuenta.");
  });

  test("RF-29: una cuenta desactivada no puede iniciar sesión; al activarla vuelve a entrar", async () => {
    const off = await request(app).patch(`/api/users/${idPedro}/estado`).set(bearer(admin.token)).send({ activo: false });
    assert.equal(off.body.data.activo, false);

    const login = await request(app).post("/api/auth/login").send({ email: "pedro@correo.com", password: "clave12345" });
    assert.equal(login.status, 403);

    await request(app).patch(`/api/users/${idPedro}/estado`).set(bearer(admin.token)).send({ activo: true });
    await iniciarSesion("pedro@correo.com");
  });

  test("usuario que no existe", async () => {
    const res = await request(app).patch("/api/users/9999/rol").set(bearer(admin.token)).send({ rol: "admin" });
    assert.equal(res.status, 404);
  });
});

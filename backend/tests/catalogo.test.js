// Catálogo público (HU01 a HU04) y administración de productos (RF-17 a RF-20)
const fs = require("fs");
const path = require("path");
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { app, pool, request, reiniciarBD, usuarioConSesion, bearer, cerrar } = require("./ayuda");

const UPLOADS = path.join(__dirname, "..", "uploads", "productos");

// un PNG de 1x1 píxel, suficiente para probar la subida de imágenes
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

let admin;
let cliente;
const subidas = [];

before(async () => {
  await reiniciarBD();
  admin = await usuarioConSesion({ email: "admin@bikestore.co", rol: "admin" });
  cliente = await usuarioConSesion({ email: "cliente@correo.com" });
});

after(async () => {
  subidas.forEach((archivo) => fs.rmSync(path.join(UPLOADS, archivo), { force: true }));
  await cerrar();
});

describe("HU01 Consultar catálogo de productos", () => {
  test("se ve sin iniciar sesión y solo trae productos activos", async () => {
    const res = await request(app).get("/api/products");
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 16); // de los 17 del script, uno está inactivo
    assert.ok(res.body.data.every((p) => p.activo === true));
  });

  test("cada producto trae imagen, nombre, precio y disponibilidad", async () => {
    const res = await request(app).get("/api/products");
    const p = res.body.data[0];
    assert.ok(p.imagen);
    assert.ok(p.nombre);
    assert.equal(typeof p.precio, "number");
    assert.equal(typeof p.stock, "number");
  });

  test("sin productos activos devuelve la lista vacía", async () => {
    await pool.execute("UPDATE productos SET activo = 0 WHERE id_producto <> 17");
    const res = await request(app).get("/api/products");
    assert.deepEqual(res.body.data, []);
    await pool.execute("UPDATE productos SET activo = 1 WHERE id_producto <> 17");
  });
});

describe("HU02 Consultar productos por categoría", () => {
  test("solo trae los productos activos de la categoría", async () => {
    const res = await request(app).get("/api/products?categoria=ruta");
    assert.equal(res.body.data.length, 2);
    assert.ok(res.body.data.every((p) => p.categoria === "ruta"));
  });

  test("una categoría sin productos devuelve la lista vacía", async () => {
    const res = await request(app).get("/api/products?categoria=electricas");
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data, []);
  });

  test("categoria=todas quita el filtro", async () => {
    const res = await request(app).get("/api/products?categoria=todas");
    assert.equal(res.body.data.length, 16);
  });
});

describe("HU03 Ordenar productos por precio", () => {
  const precios = (res) => res.body.data.map((p) => p.precio);

  test("precio ascendente", async () => {
    const res = await request(app).get("/api/products?orden=asc");
    assert.deepEqual(precios(res), [...precios(res)].sort((a, b) => a - b));
    assert.equal(precios(res)[0], 69000);
  });

  test("precio descendente", async () => {
    const res = await request(app).get("/api/products?orden=desc");
    assert.deepEqual(precios(res), [...precios(res)].sort((a, b) => b - a));
    assert.equal(precios(res)[0], 5999000);
  });

  test("el orden conserva el filtro de categoría", async () => {
    const res = await request(app).get("/api/products?categoria=montana&orden=desc");
    assert.deepEqual(precios(res), [2849000, 1650000, 899000]);
  });
});

describe("HU04 Consultar detalles de un producto", () => {
  test("trae la descripción completa sin iniciar sesión", async () => {
    const res = await request(app).get("/api/products/4");
    assert.equal(res.status, 200);
    assert.equal(res.body.data.nombre, "Ruta R8-4720 Carbono");
    assert.ok(res.body.data.descripcion.length > 20);
  });

  test("un producto agotado se puede consultar y llega con existencias en cero", async () => {
    const res = await request(app).get("/api/products/3");
    assert.equal(res.status, 200);
    assert.equal(res.body.data.stock, 0);
  });

  test("un producto inactivo o que no existe responde 404", async () => {
    assert.equal((await request(app).get("/api/products/17")).status, 404);
    assert.equal((await request(app).get("/api/products/9999")).status, 404);
    assert.equal((await request(app).get("/api/products/abc")).status, 404);
  });
});

describe("Administración de productos", () => {
  const nuevo = { nombre: "Guantes de ruta", descripcion: "Guantes cortos con gel en la palma.", categoria: "accesorios", precio: "58000", stock: "20" };
  let id;

  test("RF-17: el administrador registra un producto con su imagen", async () => {
    const res = await request(app).post("/api/products").set(bearer(admin.token))
      .field(nuevo).attach("imagen", PNG, { filename: "guantes.png", contentType: "image/png" });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.precio, 58000);
    assert.equal(res.body.data.activo, true);
    assert.match(res.body.data.imagen, /^[a-f0-9]{32}\.png$/);
    id = res.body.data.id_producto;
    subidas.push(res.body.data.imagen);

    const imagen = await request(app).get(`/uploads/productos/${res.body.data.imagen}`);
    assert.equal(imagen.status, 200);
  });

  test("sin imagen no se registra", async () => {
    const res = await request(app).post("/api/products").set(bearer(admin.token)).field(nuevo);
    assert.equal(res.status, 400);
    assert.equal(res.body.message, "Agregue una imagen del producto.");
  });

  test("valida precio, existencias y categoría", async () => {
    const enviar = (cambios) => request(app).put(`/api/products/${id}`).set(bearer(admin.token)).send({ ...nuevo, ...cambios });

    assert.equal((await enviar({ precio: "0" })).body.message, "El precio debe ser mayor que cero.");
    assert.equal((await enviar({ precio: "-500" })).status, 400);
    assert.equal((await enviar({ stock: "2.5" })).status, 400);
    assert.equal((await enviar({ stock: "-1" })).status, 400);
    assert.equal((await enviar({ categoria: "motos" })).body.message, "La categoría no existe.");
    assert.equal((await enviar({ nombre: "" })).body.message, "Complete todos los campos.");
  });

  test("RF-18: actualiza precio y existencias", async () => {
    const res = await request(app).put(`/api/products/${id}`).set(bearer(admin.token)).send({ ...nuevo, precio: 61000, stock: 35 });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.precio, 61000);
    assert.equal(res.body.data.stock, 35);
  });

  test("RF-19: al inactivarlo sale del catálogo, pero el administrador lo sigue viendo", async () => {
    const res = await request(app).patch(`/api/products/${id}/estado`).set(bearer(admin.token)).send({ activo: false });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.activo, false);

    assert.equal((await request(app).get(`/api/products/${id}`)).status, 404);
    const todos = await request(app).get("/api/products?todos=1").set(bearer(admin.token));
    assert.ok(todos.body.data.some((p) => p.id_producto === id));
  });

  test("RF-20: el administrador busca por nombre y filtra por categoría", async () => {
    const res = await request(app).get("/api/products?todos=1&q=casco").set(bearer(admin.token));
    assert.deepEqual(res.body.data.map((p) => p.id_producto), [10, 11]);

    const filtrado = await request(app).get("/api/products?todos=1&categoria=accesorios").set(bearer(admin.token));
    assert.equal(filtrado.body.data.length, 9);
  });

  test("?todos=1 no le muestra los inactivos a un cliente ni a un visitante", async () => {
    const comoCliente = await request(app).get("/api/products?todos=1").set(bearer(cliente.token));
    const sinSesion = await request(app).get("/api/products?todos=1");
    assert.ok(comoCliente.body.data.every((p) => p.activo));
    assert.ok(sinSesion.body.data.every((p) => p.activo));
  });
});

// Carrito guardado en la cuenta (RF-05 a RF-08) y pedido con pago simulado (RF-09 a RF-12)
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { app, pool, request, reiniciarBD, usuarioConSesion, bearer, cerrar } = require("./ayuda");

const ENVIO = { direccion: "Calle 30 # 28-14", ciudad: "Palmira", telefono: "3104567890", numeroCuenta: "4111 1111 1111 1234" };

let ana;
let luis;

const guardar = (usuario, items) => request(app).put("/api/cart").set(bearer(usuario.token)).send({ items });
const pagar = (usuario, datos = ENVIO) => request(app).post("/api/orders").set(bearer(usuario.token)).send(datos);
const stockDe = async (id) => (await pool.execute("SELECT stock FROM productos WHERE id_producto = ?", [id]))[0][0].stock;

before(async () => {
  await reiniciarBD();
  ana = await usuarioConSesion({ nombre: "Ana Restrepo", email: "ana@correo.com" });
  luis = await usuarioConSesion({ nombre: "Luis Vargas", email: "luis@correo.com" });
});

after(cerrar);

describe("Carrito", () => {
  test("una cuenta nueva tiene el carrito vacío", async () => {
    const res = await request(app).get("/api/cart").set(bearer(ana.token));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data, []);
  });

  test("RF-05: guarda los productos con su cantidad", async () => {
    const res = await guardar(ana, [{ id_producto: 10, cantidad: 2 }, { id_producto: 2, cantidad: 1 }]);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data, [{ id_producto: 2, cantidad: 1 }, { id_producto: 10, cantidad: 2 }]);
  });

  test("RF-07: cambia la cantidad y quita productos", async () => {
    const res = await guardar(ana, [{ id_producto: 10, cantidad: 5 }]);
    assert.deepEqual(res.body.data, [{ id_producto: 10, cantidad: 5 }]);
  });

  test("RF-08: el carrito sigue en la cuenta al volver a iniciar sesión", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: "ana@correo.com", password: "clave12345" });
    const res = await request(app).get("/api/cart").set(bearer(login.body.token));
    assert.deepEqual(res.body.data, [{ id_producto: 10, cantidad: 5 }]);
  });

  test("cada cliente tiene su propio carrito", async () => {
    const res = await request(app).get("/api/cart").set(bearer(luis.token));
    assert.deepEqual(res.body.data, []);
  });

  test("no deja pedir más unidades de las que hay", async () => {
    const res = await guardar(ana, [{ id_producto: 7, cantidad: 50 }]); // solo hay 2
    assert.deepEqual(res.body.data, [{ id_producto: 7, cantidad: 2 }]);
  });

  test("descarta productos agotados, inactivos o que no existen", async () => {
    const res = await guardar(ana, [
      { id_producto: 3, cantidad: 1 },    // agotado
      { id_producto: 17, cantidad: 1 },   // inactivo
      { id_producto: 9999, cantidad: 1 }, // no existe
      { id_producto: 12, cantidad: 1 },
    ]);
    assert.deepEqual(res.body.data, [{ id_producto: 12, cantidad: 1 }]);
  });

  test("rechaza cantidades que no son enteros mayores que cero", async () => {
    for (const cantidad of [0, -3, 1.5, "dos", null]) {
      const res = await guardar(ana, [{ id_producto: 12, cantidad }]);
      assert.equal(res.status, 400, `cantidad ${cantidad}`);
    }
    assert.equal((await guardar(ana, "no es una lista")).status, 400);
  });

  test("varios cambios al mismo tiempo no crean dos carritos", async () => {
    await Promise.all([1, 2, 3, 4, 5].map((cantidad) => guardar(luis, [{ id_producto: 14, cantidad }])));
    const [carritos] = await pool.execute("SELECT id_pedido FROM pedidos WHERE id_usuario = ? AND estado = 'Carrito'", [luis.id]);
    assert.equal(carritos.length, 1);
    await guardar(luis, []);
  });

  test("sin sesión no hay carrito", async () => {
    assert.equal((await request(app).get("/api/cart")).status, 401);
  });
});

describe("Pedido y pago simulado", () => {
  let numero;

  test("con el carrito vacío no se puede pagar", async () => {
    await guardar(ana, []);
    const res = await pagar(ana);
    assert.equal(res.status, 400);
    assert.equal(res.body.message, "Tu carrito está vacío.");
  });

  test("valida los datos de envío y de la cuenta", async () => {
    await guardar(ana, [{ id_producto: 10, cantidad: 2 }, { id_producto: 16, cantidad: 1 }]);

    assert.equal((await pagar(ana, { ...ENVIO, direccion: "" })).status, 400);
    assert.equal((await pagar(ana, { ...ENVIO, numeroCuenta: "12345" })).status, 400);
    assert.equal((await pagar(ana, { ...ENVIO, numeroCuenta: "4111-1111-abcd-1234" })).status, 400);
    assert.equal((await pagar(ana, { ...ENVIO, telefono: "123" })).status, 400);
  });

  test("pago rechazado: no se crea el pedido ni se descuentan existencias", async () => {
    const antes = await stockDe(10);
    const res = await pagar(ana, { ...ENVIO, numeroCuenta: "4111111111110000" });

    assert.equal(res.status, 402);
    assert.equal(res.body.message, "La pasarela rechazó el pago. Revise los datos de la cuenta o use otra.");
    assert.equal(await stockDe(10), antes);
    assert.equal((await request(app).get("/api/cart").set(bearer(ana.token))).body.data.length, 2);
  });

  test("RF-10, RF-11, RF-12: pago exitoso con número único y confirmación", async () => {
    const res = await pagar(ana);
    assert.equal(res.status, 201);

    const pedido = res.body.data;
    numero = pedido.numero;
    assert.match(numero, /^BS-\d{4}-\d{5}$/);
    assert.equal(pedido.estado, "Pagado");
    assert.equal(pedido.cliente, "Ana Restrepo");
    assert.equal(pedido.total, 2 * 100000 + 69000);
    assert.equal(pedido.ultimos4, "1234");
    assert.deepEqual(pedido.items.map((i) => [i.id_producto, i.precio, i.cantidad]), [[10, 100000, 2], [16, 69000, 1]]);
  });

  test("descuenta las existencias y deja el carrito vacío", async () => {
    assert.equal(await stockDe(10), 22);
    assert.equal(await stockDe(16), 2);
    assert.deepEqual((await request(app).get("/api/cart").set(bearer(ana.token))).body.data, []);
  });

  test("del número de cuenta solo se guardan los últimos 4 dígitos", async () => {
    const [[fila]] = await pool.execute("SELECT * FROM pedidos WHERE numero = ?", [numero]);
    assert.equal(fila.ultimos4, "1234");
    assert.ok(!JSON.stringify(fila).includes("4111"));
  });

  test("el pedido guarda el precio del día de la compra aunque después cambie", async () => {
    await pool.execute("UPDATE productos SET precio = 250000 WHERE id_producto = 10");
    const res = await request(app).get(`/api/orders/mine/${numero}`).set(bearer(ana.token));
    assert.equal(res.body.data.items[0].precio, 100000);
    assert.equal(res.body.data.total, 269000);
  });

  test("si ya no alcanzan las existencias, avisa y no cobra", async () => {
    await guardar(luis, [{ id_producto: 16, cantidad: 2 }]);
    await pool.execute("UPDATE productos SET stock = 1 WHERE id_producto = 16");

    const res = await pagar(luis);
    assert.equal(res.status, 409);
    assert.equal(res.body.message, "Solo quedan 1 unidades de Candado en U. Ajusta el carrito.");
    assert.equal(await stockDe(16), 1);
  });

  test("dos clientes no pueden comprar al tiempo la última unidad", async () => {
    await guardar(ana, [{ id_producto: 16, cantidad: 1 }]);
    await guardar(luis, [{ id_producto: 16, cantidad: 1 }]);

    const respuestas = await Promise.all([pagar(ana), pagar(luis)]);
    assert.deepEqual(respuestas.map((r) => r.status).sort(), [201, 409]);
    assert.equal(await stockDe(16), 0);
  });

  test("los números de pedido no se repiten", async () => {
    const [filas] = await pool.execute("SELECT numero FROM pedidos WHERE estado <> 'Carrito'");
    assert.equal(new Set(filas.map((f) => f.numero)).size, filas.length);
    assert.equal(filas.length, 2);
  });

  test("el historial trae solo los pedidos propios, sin el carrito", async () => {
    await guardar(ana, [{ id_producto: 12, cantidad: 1 }]);
    const res = await request(app).get("/api/orders/mine").set(bearer(ana.token));
    assert.ok(res.body.data.length >= 1);
    assert.ok(res.body.data.every((p) => p.cliente === "Ana Restrepo" && p.numero));
  });
});

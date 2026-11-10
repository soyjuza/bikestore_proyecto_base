// Tablero del administrador e informes exportables (RF-21 a RF-26)
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const ExcelJS = require("exceljs");
const { app, pool, request, reiniciarBD, crearUsuario, usuarioConSesion, bearer, cerrar } = require("./ayuda");

let admin;

// inserta un pedido ya pagado directamente en la base de datos
async function pedidoPagado(idUsuario, numero, fecha, lineas) {
  const total = lineas.reduce((suma, [, cantidad, precio]) => suma + cantidad * precio, 0);
  const [result] = await pool.execute(
    `INSERT INTO pedidos (numero, id_usuario, fecha, estado, direccion, ciudad, telefono, ultimos4, total)
     VALUES (?, ?, ?, 'Pagado', 'Calle 30 # 28-14', 'Palmira', '3104567890', '1234', ?)`,
    [numero, idUsuario, fecha, total],
  );
  for (const [idProducto, cantidad, precio] of lineas) {
    await pool.execute(
      "INSERT INTO pedido_detalle (id_pedido, id_producto, cantidad, precio) VALUES (?,?,?,?)",
      [result.insertId, idProducto, cantidad, precio],
    );
  }
}

const tablero = (query) => request(app).get(`/api/reports/dashboard?${query}`).set(bearer(admin.token));

before(async () => {
  await reiniciarBD();
  admin = await usuarioConSesion({ email: "admin@bikestore.co", rol: "admin" });
  const idCliente = await crearUsuario({ nombre: "Diana Paz", email: "diana@correo.com" });

  await pedidoPagado(idCliente, "BS-2026-00001", "2026-08-10 10:00:00", [[2, 1, 899000], [10, 2, 100000]]);
  await pedidoPagado(idCliente, "BS-2026-00002", "2026-09-05 16:30:00", [[10, 3, 100000]]);
  await pedidoPagado(idCliente, "BS-2026-00003", "2026-10-31 23:50:00", [[4, 1, 5999000]]);

  // un carrito pendiente: no debe contar como venta
  const [carrito] = await pool.execute("INSERT INTO pedidos (id_usuario) VALUES (?)", [idCliente]);
  await pool.execute("INSERT INTO pedido_detalle (id_pedido, id_producto, cantidad) VALUES (?, 5, 4)", [carrito.insertId]);
});

after(cerrar);

describe("Tablero", () => {
  test("RF-22 y RF-24: ventas totales, pedidos y unidades del periodo", async () => {
    const res = await tablero("desde=2026-08-01&hasta=2026-10-31&categoria=todas");
    assert.equal(res.status, 200);
    assert.equal(res.body.data.ventas, 899000 + 200000 + 300000 + 5999000);
    assert.equal(res.body.data.pedidosCount, 3);
    assert.equal(res.body.data.unidades, 7);
  });

  test("los carritos sin pagar no cuentan como ventas", async () => {
    const res = await tablero("desde=2020-01-01&hasta=2030-12-31");
    assert.equal(res.body.data.pedidosCount, 3);
    assert.ok(!res.body.data.masVendidos.some((m) => m.nombre === "Ruta Sprint Aluminio"));
  });

  test("RF-23: productos más vendidos, de más a menos unidades", async () => {
    const res = await tablero("desde=2026-08-01&hasta=2026-10-31");
    assert.deepEqual(res.body.data.masVendidos[0], { nombre: "Casco de ruta ventilado", cantidad: 5, valor: 500000 });
    assert.equal(res.body.data.masVendidos.length, 3);
  });

  test("RF-25: filtra por fechas, incluyendo todo el último día", async () => {
    const res = await tablero("desde=2026-09-01&hasta=2026-10-31");
    assert.equal(res.body.data.pedidosCount, 2);
    assert.deepEqual(res.body.data.pedidos.map((p) => p.numero), ["BS-2026-00003", "BS-2026-00002"]);
  });

  test("RF-25: filtra por categoría", async () => {
    const res = await tablero("desde=2026-08-01&hasta=2026-10-31&categoria=accesorios");
    assert.equal(res.body.data.ventas, 500000);
    assert.equal(res.body.data.pedidosCount, 2);
    assert.equal(res.body.data.unidades, 5);
  });

  test("ventas por mes, con los meses sin ventas en cero", async () => {
    const res = await tablero("desde=2026-07-15&hasta=2026-10-31");
    assert.deepEqual(res.body.data.meses, [
      { mes: "2026-07", etiqueta: "jul 26", valor: 0 },
      { mes: "2026-08", etiqueta: "ago 26", valor: 1099000 },
      { mes: "2026-09", etiqueta: "sep 26", valor: 300000 },
      { mes: "2026-10", etiqueta: "oct 26", valor: 5999000 },
    ]);
  });

  test("RF-21: alertas de productos activos con 3 unidades o menos", async () => {
    const res = await tablero("desde=2026-08-01&hasta=2026-10-31");
    assert.deepEqual(res.body.data.alertas.map((a) => [a.id_producto, a.stock]), [[3, 0], [7, 2], [4, 3], [16, 3]]);
  });

  test("rechaza fechas mal escritas, al revés o categorías que no existen", async () => {
    assert.equal((await tablero("desde=2026-13-45&hasta=2026-10-31")).status, 400);
    assert.equal((await tablero("desde=ayer&hasta=hoy")).status, 400);
    assert.equal((await tablero("hasta=2026-10-31")).status, 400);
    assert.equal((await tablero("desde=2026-10-31&hasta=2026-08-01")).status, 400);
    assert.equal((await tablero("desde=2026-08-01&hasta=2026-10-31&categoria=motos")).status, 400);
  });
});

describe("RF-26 Exportar informes", () => {
  test("Excel con las hojas Resumen, Más vendidos y Pedidos", async () => {
    const res = await request(app).get("/api/reports/export/excel?desde=2026-08-01&hasta=2026-10-31")
      .set(bearer(admin.token)).buffer(true).parse((r, cb) => {
        const partes = [];
        r.on("data", (p) => partes.push(p));
        r.on("end", () => cb(null, Buffer.concat(partes)));
      });

    assert.equal(res.status, 200);
    assert.match(res.headers["content-type"], /spreadsheetml/);
    assert.match(res.headers["content-disposition"], /informe-bikestore-2026-08-01-a-2026-10-31\.xlsx/);

    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(res.body);
    assert.deepEqual(libro.worksheets.map((h) => h.name), ["Resumen", "Más vendidos", "Pedidos"]);
    assert.equal(libro.getWorksheet("Resumen").getCell("B5").value, 7398000);
    assert.equal(libro.getWorksheet("Pedidos").rowCount, 4);
  });

  test("PDF del mismo informe", async () => {
    const res = await request(app).get("/api/reports/export/pdf?desde=2026-08-01&hasta=2026-10-31&categoria=ruta")
      .set(bearer(admin.token)).buffer(true).parse((r, cb) => {
        const partes = [];
        r.on("data", (p) => partes.push(p));
        r.on("end", () => cb(null, Buffer.concat(partes)));
      });

    assert.equal(res.status, 200);
    assert.equal(res.headers["content-type"], "application/pdf");
    assert.equal(res.body.subarray(0, 5).toString(), "%PDF-");
  });

  test("no exporta con fechas inválidas", async () => {
    const res = await request(app).get("/api/reports/export/excel?desde=x&hasta=y").set(bearer(admin.token));
    assert.equal(res.status, 400);
  });
});

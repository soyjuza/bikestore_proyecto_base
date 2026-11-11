// Pruebas de seguridad: se ataca la API como lo haría alguien sin permiso (RNF-04, RNF-05, RNF-06, RF-30)
const fs = require("fs");
const path = require("path");
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { app, pool, request, correos, tokenDelCorreo, reiniciarBD, usuarioConSesion, iniciarSesion, bearer, cerrar } = require("./ayuda");

const UPLOADS = path.join(__dirname, "..", "uploads", "productos");
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
const PRODUCTO = { nombre: "Timbre", descripcion: "Timbre de aluminio.", categoria: "accesorios", precio: "15000", stock: "5" };
const ENVIO = { direccion: "Calle 30 # 28-14", ciudad: "Palmira", telefono: "3104567890", numeroCuenta: "4111111111111234" };

let admin;
let ana;
let luis;
let archivosAntes;

const archivosSubidos = () => fs.readdirSync(UPLOADS).filter((a) => a !== ".gitkeep");

before(async () => {
  await reiniciarBD();
  admin = await usuarioConSesion({ nombre: "Admin Tienda", email: "admin@bikestore.co", rol: "admin" });
  ana = await usuarioConSesion({ nombre: "Ana Restrepo", email: "ana@correo.com" });
  luis = await usuarioConSesion({ nombre: "Luis Vargas", email: "luis@correo.com" });
  archivosAntes = archivosSubidos();
});

after(async () => {
  // se borran las imágenes que dejaron las pruebas
  archivosSubidos().filter((a) => !archivosAntes.includes(a)).forEach((a) => fs.rmSync(path.join(UPLOADS, a)));
  await cerrar();
});

describe("Control de acceso por rol", () => {
  const rutasAdmin = [
    ["post", "/api/products"],
    ["put", "/api/products/1"],
    ["patch", "/api/products/1/estado"],
    ["get", "/api/users"],
    ["patch", "/api/users/2/rol"],
    ["patch", "/api/users/2/estado"],
    ["get", "/api/reports/dashboard?desde=2026-08-01&hasta=2026-10-31"],
    ["get", "/api/reports/export/excel?desde=2026-08-01&hasta=2026-10-31"],
    ["get", "/api/reports/export/pdf?desde=2026-08-01&hasta=2026-10-31"],
  ];
  const rutasConSesion = [
    ["get", "/api/cart"],
    ["put", "/api/cart"],
    ["post", "/api/orders"],
    ["get", "/api/orders/mine"],
    ["get", "/api/orders/mine/BS-2026-00001"],
    ["put", "/api/users/me"],
    ["put", "/api/users/me/password"],
  ];

  test("sin token, todas las rutas protegidas responden 401", async () => {
    for (const [metodo, ruta] of [...rutasAdmin, ...rutasConSesion]) {
      const res = await request(app)[metodo](ruta);
      assert.equal(res.status, 401, `${metodo} ${ruta}`);
    }
  });

  test("un cliente no entra a ninguna ruta del administrador (403)", async () => {
    for (const [metodo, ruta] of rutasAdmin) {
      const res = await request(app)[metodo](ruta).set(bearer(ana.token)).send({ rol: "admin", activo: false });
      assert.equal(res.status, 403, `${metodo} ${ruta}`);
    }
  });

  test("un cliente no puede volverse administrador ni desactivar a otro", async () => {
    await request(app).patch(`/api/users/${ana.id}/rol`).set(bearer(ana.token)).send({ rol: "admin" });
    await request(app).patch(`/api/users/${luis.id}/estado`).set(bearer(ana.token)).send({ activo: false });

    const [filas] = await pool.execute("SELECT rol, activo FROM usuarios WHERE id_usuario IN (?, ?)", [ana.id, luis.id]);
    assert.ok(filas.every((f) => f.rol === "cliente" && f.activo === 1));
  });

  test("al registrarse no se puede escoger el rol", async () => {
    const res = await request(app).post("/api/auth/register")
      .send({ nombre: "Intruso", email: "intruso@correo.com", password: "Clave12345*", rol: "admin", activo: 1, id_usuario: 1 });
    assert.equal(res.status, 201);

    const [[user]] = await pool.execute("SELECT rol FROM usuarios WHERE email = 'intruso@correo.com'");
    assert.equal(user.rol, "cliente");
  });

  test("en «Mis datos» no se puede cambiar el rol ni el id", async () => {
    await request(app).put("/api/users/me").set(bearer(ana.token))
      .send({ nombre: "Ana Restrepo", email: "ana@correo.com", rol: "admin", id_usuario: admin.id });

    const [[user]] = await pool.execute("SELECT rol FROM usuarios WHERE id_usuario = ?", [ana.id]);
    assert.equal(user.rol, "cliente");
  });

  test("un cliente no puede ver el pedido de otro aunque sepa el número", async () => {
    await request(app).put("/api/cart").set(bearer(luis.token)).send({ items: [{ id_producto: 12, cantidad: 1 }] });
    const pedido = await request(app).post("/api/orders").set(bearer(luis.token)).send(ENVIO);
    assert.equal(pedido.status, 201);

    const ajeno = await request(app).get(`/api/orders/mine/${pedido.body.data.numero}`).set(bearer(ana.token));
    assert.equal(ajeno.status, 404);

    const historial = await request(app).get("/api/orders/mine").set(bearer(ana.token));
    assert.deepEqual(historial.body.data, []);
  });

  test("el carrito es el de quien tiene la sesión, no el que diga la petición", async () => {
    await request(app).put("/api/cart").set(bearer(ana.token))
      .send({ id_usuario: luis.id, items: [{ id_producto: 14, cantidad: 1, id_usuario: luis.id }] });

    const deLuis = await request(app).get("/api/cart").set(bearer(luis.token));
    assert.deepEqual(deLuis.body.data, []);
  });
});

describe("Tokens", () => {
  const SECRETO = process.env.JWT_SECRET;
  const probar = (token) => request(app).get("/api/users").set(bearer(token));

  test("token firmado con otra clave", async () => {
    const falso = jwt.sign({ id_usuario: admin.id, rol: "admin" }, "otra-clave-cualquiera-de-un-atacante");
    assert.equal((await probar(falso)).status, 401);
  });

  test("token de cliente con el contenido cambiado a admin", async () => {
    const [cabecera, , firma] = ana.token.split(".");
    const contenido = Buffer.from(JSON.stringify({ ...jwt.decode(ana.token), id_usuario: admin.id, rol: "admin" })).toString("base64url");
    assert.equal((await probar(`${cabecera}.${contenido}.${firma}`)).status, 401);
  });

  test("token sin firma (alg none)", async () => {
    const cabecera = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const contenido = Buffer.from(JSON.stringify(jwt.decode(admin.token))).toString("base64url");
    assert.equal((await probar(`${cabecera}.${contenido}.`)).status, 401);
  });

  test("token vencido", async () => {
    const { id_usuario, rol, huella } = jwt.decode(admin.token);
    const vencido = jwt.sign({ id_usuario, rol, huella }, SECRETO, { expiresIn: -60 });
    assert.equal((await probar(vencido)).status, 401);
  });

  test("texto cualquiera en lugar del token", async () => {
    assert.equal((await probar("no-es-un-token")).status, 401);
    assert.equal((await request(app).get("/api/users").set("Authorization", "Basic YWRtaW46YWRtaW4=")).status, 401);
  });

  test("el token no lleva datos personales ni la contraseña", () => {
    assert.deepEqual(Object.keys(jwt.decode(ana.token)).sort(), ["exp", "huella", "iat", "id_usuario", "rol"]);
  });

  test("el rol que vale es el de la base de datos: si le quitan el rol admin, su token viejo ya no entra", async () => {
    const temporal = await usuarioConSesion({ email: "temporal@bikestore.co", rol: "admin" });
    assert.equal((await probar(temporal.token)).status, 200);

    await request(app).patch(`/api/users/${temporal.id}/rol`).set(bearer(admin.token)).send({ rol: "cliente" });
    assert.equal((await probar(temporal.token)).status, 403);
  });

  test("si desactivan la cuenta, el token que ya tenía deja de servir", async () => {
    const pedro = await usuarioConSesion({ email: "pedro@correo.com" });
    assert.equal((await request(app).get("/api/cart").set(bearer(pedro.token))).status, 200);

    await request(app).patch(`/api/users/${pedro.id}/estado`).set(bearer(admin.token)).send({ activo: false });
    assert.equal((await request(app).get("/api/cart").set(bearer(pedro.token))).status, 401);
  });

  test("al cambiar la contraseña, las sesiones anteriores se cierran", async () => {
    const sara = await usuarioConSesion({ email: "sara@correo.com" });
    const otroEquipo = await iniciarSesion("sara@correo.com");

    await request(app).put("/api/users/me/password").set(bearer(sara.token)).send({ actual: "clave12345", nueva: "NuevaClave99*" });

    assert.equal((await request(app).get("/api/cart").set(bearer(sara.token))).status, 401);
    assert.equal((await request(app).get("/api/cart").set(bearer(otroEquipo))).status, 401);
  });

  test("al recuperar la contraseña, quien tuviera la sesión abierta queda por fuera", async () => {
    const tomas = await usuarioConSesion({ email: "tomas@correo.com" });

    await request(app).post("/api/auth/recover").send({ email: "tomas@correo.com" });
    const token = tokenDelCorreo();
    await request(app).post("/api/auth/reset").send({ token, password: "Recuperada77*" });

    assert.equal((await request(app).get("/api/cart").set(bearer(tomas.token))).status, 401);
  });
});

describe("Inyección y datos mal formados", () => {
  const INYECCIONES = ["' OR '1'='1", "admin@bikestore.co' -- ", "'; DROP TABLE usuarios; -- ", "\" OR \"\"=\"", "1 UNION SELECT password FROM usuarios"];

  test("inyección SQL en el inicio de sesión: no entra y no se cae", async () => {
    for (const texto of INYECCIONES) {
      const porCorreo = await request(app).post("/api/auth/login").send({ email: texto, password: "clave12345" });
      const porClave = await request(app).post("/api/auth/login").send({ email: "admin@bikestore.co", password: texto });
      assert.equal(porCorreo.status, 401, texto);
      assert.equal(porClave.status, 401, texto);
      assert.equal(porCorreo.body.token, undefined);
    }
  });

  test("inyección SQL en la dirección del producto y en los filtros del catálogo", async () => {
    assert.equal((await request(app).get("/api/products/" + encodeURIComponent("1 OR 1=1"))).status, 404);
    assert.equal((await request(app).get("/api/products/" + encodeURIComponent("1; DROP TABLE productos"))).status, 404);

    for (const texto of INYECCIONES) {
      const valor = encodeURIComponent(texto);
      const res = await request(app).get(`/api/products?categoria=${valor}&q=${valor}&orden=${valor}`);
      assert.equal(res.status, 200, texto);
      assert.deepEqual(res.body.data, []);
    }
  });

  test("el orden solo acepta asc o desc; cualquier otra cosa se ignora", async () => {
    for (const orden of ["precio; DROP TABLE productos", "constructor", "__proto__", "toString", "(SELECT SLEEP(5))"]) {
      const res = await request(app).get(`/api/products?orden=${encodeURIComponent(orden)}`);
      assert.equal(res.status, 200, orden);
      assert.equal(res.body.data.length, 16);
    }
    const repetido = await request(app).get("/api/products?orden=asc&orden=desc&categoria[a]=1&q[]=x");
    assert.equal(repetido.status, 200);
  });

  test("inyección SQL en el número de pedido, la búsqueda de usuarios y las fechas del informe", async () => {
    const pedido = await request(app).get("/api/orders/mine/" + encodeURIComponent("BS-2026-00001' OR '1'='1")).set(bearer(ana.token));
    assert.equal(pedido.status, 404);

    const usuarios = await request(app).get("/api/users?q=" + encodeURIComponent("' OR '1'='1")).set(bearer(admin.token));
    assert.deepEqual(usuarios.body.data, []);

    const informe = await request(app).get("/api/reports/dashboard?hasta=2026-10-31&desde=" + encodeURIComponent("2026-08-01' OR '1'='1"))
      .set(bearer(admin.token));
    assert.equal(informe.status, 400);
  });

  test("después de todos los intentos las tablas siguen completas", async () => {
    const [[usuarios]] = await pool.execute("SELECT COUNT(*) AS n FROM usuarios");
    const [[productos]] = await pool.execute("SELECT COUNT(*) AS n FROM productos");
    assert.ok(usuarios.n >= 3);
    assert.equal(productos.n, 17);
  });

  test("objetos, listas o números donde va un texto: responde 400 o 401, nunca 500", async () => {
    const raros = [{ $gt: "" }, ["a@b.co"], 12345, true, null, { length: 100 }];

    for (const raro of raros) {
      const login = await request(app).post("/api/auth/login").send({ email: raro, password: raro });
      const registro = await request(app).post("/api/auth/register").send({ nombre: raro, email: raro, password: raro });
      const recuperar = await request(app).post("/api/auth/recover").send({ email: raro });
      const cambiar = await request(app).post("/api/auth/reset").send({ token: raro, password: raro });
      const clave = await request(app).put("/api/users/me/password").set(bearer(ana.token)).send({ actual: raro, nueva: raro });
      const pago = await request(app).post("/api/orders").set(bearer(ana.token)).send({ ...ENVIO, numeroCuenta: raro });

      for (const res of [login, registro, recuperar, cambiar, clave, pago]) {
        assert.ok(res.status >= 400 && res.status < 500, `${JSON.stringify(raro)} -> ${res.status}`);
      }
    }
  });

  test("JSON mal escrito responde 400 y un cuerpo de más de 100 kb responde 413", async () => {
    const roto = await request(app).post("/api/auth/login").set("Content-Type", "application/json").send('{"email": "a@b.co", ');
    assert.equal(roto.status, 400);

    const enorme = await request(app).post("/api/auth/register")
      .send({ nombre: "x".repeat(200 * 1024), email: "grande@correo.com", password: "clave12345" });
    assert.equal(enorme.status, 413);
  });

  test("petición sin cuerpo no tumba el servidor", async () => {
    assert.equal((await request(app).post("/api/auth/login")).status, 400);
    assert.equal((await request(app).post("/api/auth/reset")).status, 400);
    assert.equal((await request(app).put("/api/cart").set(bearer(ana.token))).status, 200);
  });

  test("contraseña gigante: se rechaza sin ponerse a cifrarla", async () => {
    const res = await request(app).post("/api/auth/register")
      .send({ nombre: "Largo", email: "largo@correo.com", password: "a".repeat(5000) });
    assert.equal(res.status, 400);
  });

  test("un nombre con HTML se guarda como texto y la API siempre responde JSON", async () => {
    const nombre = '<script>alert("xss")</script>';
    await request(app).post("/api/auth/register").send({ nombre, email: "xss@correo.com", password: "Clave12345*" });

    const res = await request(app).get("/api/users?q=xss@correo.com").set(bearer(admin.token));
    assert.equal(res.body.data[0].nombre, nombre);
    assert.match(res.headers["content-type"], /^application\/json/);
    assert.equal(res.headers["x-content-type-options"], "nosniff");
  });
});

describe("Contraseñas y datos sensibles", () => {
  test("RNF-05: la contraseña se guarda cifrada con bcrypt, nunca en texto plano", async () => {
    await request(app).post("/api/auth/register").send({ nombre: "Nora", email: "nora@correo.com", password: "MiClaveSecreta1*" });

    const [[user]] = await pool.execute("SELECT password FROM usuarios WHERE email = 'nora@correo.com'");
    assert.match(user.password, /^\$2[aby]\$\d{2}\$.{53}$/);
    assert.ok(!user.password.includes("MiClaveSecreta1*"));
  });

  test("ninguna respuesta trae la contraseña ni su hash", async () => {
    const respuestas = [
      await request(app).post("/api/auth/login").send({ email: "ana@correo.com", password: "clave12345" }),
      await request(app).get("/api/users").set(bearer(admin.token)),
      await request(app).put("/api/users/me").set(bearer(ana.token)).send({ nombre: "Ana Restrepo", email: "ana@correo.com" }),
      await request(app).patch(`/api/users/${luis.id}/estado`).set(bearer(admin.token)).send({ activo: true }),
    ];
    for (const res of respuestas) {
      assert.equal(res.status, 200);
      assert.ok(!JSON.stringify(res.body).includes("$2"), "la respuesta no debe traer el hash");
      assert.ok(!JSON.stringify(res.body).includes('"password"'));
    }
  });

  test("el enlace de recuperación se guarda como hash y el token no viaja en la respuesta", async () => {
    const res = await request(app).post("/api/auth/recover").send({ email: "ana@correo.com" });
    const token = tokenDelCorreo();

    const [filas] = await pool.execute("SELECT token FROM recuperaciones");
    assert.ok(filas.length > 0);
    assert.ok(filas.every((f) => f.token !== token));
    assert.ok(!JSON.stringify(res.body).includes(token));
  });

  test("no se puede adivinar ni reutilizar un enlace de recuperación", async () => {
    const inventado = "a".repeat(64);
    assert.equal((await request(app).get(`/api/auth/reset/${inventado}`)).status, 410);
    assert.equal((await request(app).post("/api/auth/reset").send({ token: inventado, password: "Clave12345*" })).status, 410);
    assert.equal((await request(app).get("/api/auth/reset/" + encodeURIComponent("' OR '1'='1"))).status, 410);
  });

  test("un error interno no le muestra al cliente el detalle de la base de datos", async (t) => {
    t.mock.method(console, "error", () => {});
    t.mock.method(pool, "execute", async () => {
      throw new Error("ER_ACCESS_DENIED_ERROR: Access denied for user 'root'@'localhost' (using password: YES)");
    });

    const res = await request(app).get("/api/products");
    assert.equal(res.status, 500);
    assert.deepEqual(res.body, { ok: false, message: "Error interno del servidor" });
  });

  test("el número de la cuenta de pago no queda guardado en ninguna tabla", async () => {
    const [pedidos] = await pool.execute("SELECT * FROM pedidos");
    assert.ok(!JSON.stringify(pedidos).includes("4111111111111234"));
  });
});

describe("Subida de imágenes", () => {
  const subir = (token, archivo, opciones) =>
    request(app).post("/api/products").set(bearer(token)).field(PRODUCTO).attach("imagen", archivo, opciones);

  test("un cliente no puede subir archivos", async () => {
    const antes = archivosSubidos().length;
    const res = await subir(ana.token, PNG, { filename: "foto.png", contentType: "image/png" });
    assert.equal(res.status, 403);
    assert.equal(archivosSubidos().length, antes);
  });

  test("un HTML o un script disfrazado de imagen se rechaza y no queda en el servidor", async () => {
    const antes = archivosSubidos().length;
    const html = Buffer.from("<html><script>alert(1)</script></html>");
    const php = Buffer.from("<?php system($_GET['c']); ?>");

    assert.equal((await subir(admin.token, html, { filename: "foto.png", contentType: "image/png" })).status, 400);
    assert.equal((await subir(admin.token, php, { filename: "foto.jpg", contentType: "image/jpeg" })).status, 400);
    assert.equal((await subir(admin.token, html, { filename: "pagina.html", contentType: "text/html" })).status, 400);
    assert.equal((await subir(admin.token, Buffer.from("<svg onload='alert(1)'/>"), { filename: "x.svg", contentType: "image/svg+xml" })).status, 400);
    assert.equal(archivosSubidos().length, antes);
  });

  test("el nombre del archivo lo pone el servidor: no sirve mandar ../ ni doble extensión", async () => {
    for (const filename of ["../../../server.js", "foto.php.png", "..\\..\\app.js"]) {
      const res = await subir(admin.token, PNG, { filename, contentType: "image/png" });
      assert.equal(res.status, 201, filename);
      assert.match(res.body.data.imagen, /^[a-f0-9]{32}\.png$/);
    }
    assert.ok(fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8").includes("seedAdmin"));
  });

  test("una imagen de más de 2 MB se rechaza", async () => {
    const grande = Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024 + 10)]);
    const res = await subir(admin.token, grande, { filename: "grande.png", contentType: "image/png" });
    assert.equal(res.status, 400);
    assert.equal(res.body.message, "La imagen no puede pesar más de 2 MB");
  });

  test("si los datos del producto están mal, la imagen subida se borra", async () => {
    const antes = archivosSubidos().length;
    const res = await request(app).post("/api/products").set(bearer(admin.token))
      .field({ ...PRODUCTO, precio: "-1" }).attach("imagen", PNG, { filename: "foto.png", contentType: "image/png" });
    assert.equal(res.status, 400);
    assert.equal(archivosSubidos().length, antes);
  });

  test("desde /uploads no se puede leer nada fuera de la carpeta de imágenes", async () => {
    assert.equal((await request(app).get("/uploads/productos/.gitkeep")).status, 404);
    assert.equal((await request(app).get("/uploads/%2e%2e/package.json")).status, 404);
    assert.equal((await request(app).get("/uploads/..%2f.env")).status, 404);
    assert.equal((await request(app).get("/uploads/productos/")).status, 404);
  });
});

describe("Cabeceras y origen de las peticiones", () => {
  test("la API responde con las cabeceras de seguridad y sin decir que usa Express", async () => {
    const res = await request(app).get("/api/health");
    assert.equal(res.headers["x-powered-by"], undefined);
    assert.equal(res.headers["x-content-type-options"], "nosniff");
    assert.equal(res.headers["x-frame-options"], "SAMEORIGIN");
    assert.ok(res.headers["content-security-policy"]);
    assert.ok(res.headers["referrer-policy"]);
  });

  test("CORS: solo el frontend del proyecto puede leer las respuestas desde un navegador", async () => {
    const propio = await request(app).get("/api/products").set("Origin", "http://localhost:5173");
    const ajeno = await request(app).get("/api/products").set("Origin", "http://sitio-malicioso.com");

    assert.equal(propio.headers["access-control-allow-origin"], "http://localhost:5173");
    assert.equal(ajeno.headers["access-control-allow-origin"], undefined);
  });
});

describe("Reglas de la compra que no se pueden saltar", () => {
  test("el precio lo pone el servidor: no sirve mandar otro precio ni otro total", async () => {
    await request(app).put("/api/cart").set(bearer(ana.token))
      .send({ items: [{ id_producto: 4, cantidad: 1, precio: 1, total: 1 }] });

    const res = await request(app).post("/api/orders").set(bearer(ana.token)).send({ ...ENVIO, total: 1, precio: 1, estado: "Entregado" });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.total, 5999000);
    assert.equal(res.body.data.estado, "Pagado");
  });

  test("cantidades negativas o gigantes no sirven para sumar existencias", async () => {
    const negativa = await request(app).put("/api/cart").set(bearer(ana.token)).send({ items: [{ id_producto: 10, cantidad: -5 }] });
    assert.equal(negativa.status, 400);

    await request(app).put("/api/cart").set(bearer(ana.token)).send({ items: [{ id_producto: 10, cantidad: 999999999 }] });
    const carrito = await request(app).get("/api/cart").set(bearer(ana.token));
    assert.deepEqual(carrito.body.data, [{ id_producto: 10, cantidad: 24 }]);

    const [[producto]] = await pool.execute("SELECT stock FROM productos WHERE id_producto = 10");
    assert.equal(producto.stock, 24);
  });

  test("RNF-06: la base de datos tampoco deja guardar existencias negativas ni pedidos pagados sin datos", async () => {
    await assert.rejects(pool.execute("UPDATE productos SET stock = -1 WHERE id_producto = 10"));
    await assert.rejects(pool.execute("UPDATE productos SET precio = 0 WHERE id_producto = 10"));
    await assert.rejects(pool.execute("INSERT INTO pedidos (id_usuario, estado) VALUES (?, 'Pagado')", [ana.id]));
    await assert.rejects(pool.execute("INSERT INTO pedidos (id_usuario) VALUES (999999)"));
  });
});

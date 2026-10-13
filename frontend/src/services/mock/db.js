/* Backend simulado para el modo demo (VITE_USE_MOCK=true).
   Guarda todo en localStorage y aplica las mismas reglas que debe aplicar el backend real,
   para que el frontend se pueda usar completo mientras se construye la API.
   Cada función corresponde a un endpoint; ver README.md para la tabla de rutas. */
import { SEED_PRODUCTOS, SEED_USUARIOS } from '../../data/seed';
import { getUser } from '../../utils/storage';
import { EMAIL_RE, isoDate, today } from '../../utils/format';

const KEY = 'bikestore-demo-v1';
const clone = (o) => JSON.parse(JSON.stringify(o));

class MockError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

// generador pseudoaleatorio con semilla: los pedidos de ejemplo salen iguales en cada equipo
function rng(a) {
    return function () {
        a |= 0; a = a + 0x6D2B79F5 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function seedPedidos() {
    const r = rng(42);
    const out = [];
    const compradores = [2, 3, 5, 6, 4].map((id) => SEED_USUARIOS.find((u) => u.id_usuario === id));
    const pool = SEED_PRODUCTOS.filter((p) => p.activo);
    const start = new Date(2026, 7, 3);

    for (let i = 0; i < 30; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + Math.floor(i * 66 / 30 + r() * 2));
        const n = 1 + Math.floor(r() * 3);
        const items = [];
        const seen = {};
        for (let j = 0; j < n; j++) {
            const p = pool[Math.floor(r() * pool.length)];
            if (seen[p.id_producto]) continue;
            seen[p.id_producto] = 1;
            items.push({
                id_producto: p.id_producto, nombre: p.nombre, categoria: p.categoria, precio: p.precio,
                cantidad: p.categoria === 'accesorios' ? 1 + Math.floor(r() * 2) : 1
            });
        }
        const u = compradores[Math.floor(r() * compradores.length)];
        out.push({
            numero: 'BS-2026-' + String(i + 1).padStart(5, '0'),
            fecha: isoDate(d),
            id_usuario: u.id_usuario,
            cliente: u.nombre,
            email: u.email,
            items,
            total: items.reduce((a, l) => a + l.precio * l.cantidad, 0),
            ciudad: 'Palmira',
            direccion: 'Calle 30 # 28-14'
        });
    }
    return out;
}

function fresh() {
    const pedidos = seedPedidos();
    return {
        productos: clone(SEED_PRODUCTOS),
        usuarios: clone(SEED_USUARIOS),
        pedidos,
        carritos: {},
        recuperaciones: {},
        seqPedido: pedidos.length
    };
}

let DB = null;
try {
    DB = JSON.parse(localStorage.getItem(KEY));
} catch {
    DB = null;
}
if (!DB || !DB.productos || !DB.usuarios) DB = fresh();

function save() {
    try {
        localStorage.setItem(KEY, JSON.stringify(DB));
    } catch {
        throw new MockError('No se pudo guardar en el navegador (almacenamiento lleno). Usa una imagen más liviana.', 507);
    }
}

// pequeña espera para que la interfaz se comporte como con una API real
const wait = (ms = 120) => new Promise((r) => setTimeout(r, ms));

function publicUser(u) {
    const { password, ...rest } = u;
    return rest;
}

function findUser(id) {
    return DB.usuarios.find((u) => u.id_usuario === id) || null;
}

function userByEmail(email) {
    const e = String(email || '').trim().toLowerCase();
    return DB.usuarios.find((u) => u.email.toLowerCase() === e) || null;
}

// equivale a auth.middleware: la sesión guardada debe corresponder a una cuenta activa
function currentUser() {
    const s = getUser();
    const u = s && findUser(s.id_usuario);
    if (!u || !u.activo) throw new MockError('Token inválido o expirado', 401);
    return u;
}

// equivale a role.middleware (RF-30)
function requireAdmin() {
    const u = currentUser();
    if (u.rol !== 'admin') throw new MockError('No tienes permisos para realizar esta operación', 403);
    return u;
}

function findProduct(id) {
    return DB.productos.find((p) => p.id_producto === Number(id)) || null;
}

export function resetDemo() {
    DB = fresh();
    save();
}

/* ---------------- auth ---------------- */
export async function login({ email, password }) {
    await wait();
    if (!email || !password) throw new MockError('Complete todos los campos.');
    const u = userByEmail(email);
    if (!u || u.password !== password) throw new MockError('Correo o contraseña incorrectos.', 401);
    if (!u.activo) throw new MockError('Su cuenta está desactivada. Comuníquese con el administrador de la tienda.', 403);
    return { token: 'demo.' + u.id_usuario, user: publicUser(u) };
}

export async function register({ nombre, email, password }) {
    await wait();
    if (!nombre || !email || !password) throw new MockError('Complete todos los campos.');
    if (password.length < 8) throw new MockError('La contraseña debe tener al menos 8 caracteres.');
    if (!EMAIL_RE.test(email)) throw new MockError('Ingrese un correo electrónico válido.');
    if (userByEmail(email)) throw new MockError('Este correo ya tiene una cuenta.', 409);
    const id = Math.max(0, ...DB.usuarios.map((u) => u.id_usuario)) + 1;
    DB.usuarios.push({ id_usuario: id, nombre, email, password, rol: 'cliente', activo: true, created_at: today() });
    save();
    return { id_usuario: id };
}

// En el backend real se envía un correo con el enlace; aquí se devuelve el token para mostrar el correo simulado.
export async function requestPasswordReset(email) {
    await wait();
    if (!email) throw new MockError('Ingrese su correo electrónico.');
    const u = userByEmail(email);
    if (!u) throw new MockError('No hay una cuenta registrada con ese correo.', 404);
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    DB.recuperaciones[token] = { id_usuario: u.id_usuario, expira: Date.now() + 30 * 60 * 1000, usado: false };
    save();
    return { token };
}

function validResetToken(token) {
    const r = DB.recuperaciones[token];
    if (!r || r.usado || r.expira < Date.now()) throw new MockError('El enlace ya no es válido. Solicite uno nuevo.', 410);
    return r;
}

export async function checkResetToken(token) {
    await wait(60);
    validResetToken(token);
    return { ok: true };
}

export async function resetPassword(token, password) {
    await wait();
    const r = validResetToken(token);
    if (!password || password.length < 8) throw new MockError('La contraseña debe tener al menos 8 caracteres.');
    findUser(r.id_usuario).password = password;
    r.usado = true;
    save();
}

/* ---------------- productos ---------------- */
export async function listProducts({ incluirInactivos = false } = {}) {
    await wait(60);
    if (incluirInactivos) requireAdmin();
    return clone(DB.productos.filter((p) => incluirInactivos || p.activo));
}

export async function getProduct(id) {
    await wait(60);
    const p = findProduct(id);
    if (!p || !p.activo) throw new MockError('Producto no disponible', 404);
    return clone(p);
}

function validateProduct({ nombre, descripcion, precio, stock }) {
    if (!nombre || !descripcion || precio === '' || stock === '') throw new MockError('Complete todos los campos.');
    if (!(Number(precio) > 0)) throw new MockError('El precio debe ser mayor que cero.');
    if (!/^\d+$/.test(String(stock))) throw new MockError('Las existencias deben ser un número entero mayor o igual a cero.');
}

export async function createProduct(data) {
    await wait();
    requireAdmin();
    validateProduct(data);
    if (!data.imagen) throw new MockError('Agregue una imagen del producto.');
    const id = Math.max(0, ...DB.productos.map((p) => p.id_producto)) + 1;
    const p = {
        id_producto: id, nombre: data.nombre, descripcion: data.descripcion, categoria: data.categoria,
        precio: Math.round(Number(data.precio)), stock: Number(data.stock), activo: true, imagen: data.imagen, foto: null
    };
    DB.productos.unshift(p);
    save();
    return clone(p);
}

export async function updateProduct(id, data) {
    await wait();
    requireAdmin();
    validateProduct(data);
    const p = findProduct(id);
    if (!p) throw new MockError('Producto no encontrado', 404);
    Object.assign(p, {
        nombre: data.nombre, descripcion: data.descripcion, categoria: data.categoria,
        precio: Math.round(Number(data.precio)), stock: Number(data.stock)
    });
    if (data.imagen) {
        p.imagen = data.imagen;
        p.foto = null;
    }
    save();
    return clone(p);
}

export async function setProductActive(id, activo) {
    await wait(60);
    requireAdmin();
    const p = findProduct(id);
    if (!p) throw new MockError('Producto no encontrado', 404);
    p.activo = activo;
    save();
    return clone(p);
}

/* ---------------- carrito (queda guardado en la cuenta, RF-08) ---------------- */
export async function getCart() {
    await wait(40);
    const u = currentUser();
    return clone(DB.carritos[u.id_usuario] || []);
}

export async function saveCart(items) {
    await wait(40);
    const u = currentUser();
    DB.carritos[u.id_usuario] = items.map((i) => ({ id_producto: i.id_producto, cantidad: i.cantidad }));
    save();
    return clone(DB.carritos[u.id_usuario]);
}

/* ---------------- pedidos y pago simulado (RF-09 a RF-12) ---------------- */
export async function createOrder({ direccion, ciudad, telefono, numeroCuenta }) {
    await wait(300);
    const u = currentUser();
    const items = (DB.carritos[u.id_usuario] || [])
        .map((i) => ({ i, p: findProduct(i.id_producto) }))
        .filter((x) => x.p && x.p.activo);
    if (!items.length) throw new MockError('Tu carrito está vacío.');

    for (const { i, p } of items) {
        if (i.cantidad > p.stock) throw new MockError(`Solo quedan ${p.stock} unidades de ${p.nombre}. Ajusta el carrito.`, 409);
    }

    const num = String(numeroCuenta).replace(/\D/g, '');
    if (num.slice(-4) === '0000') throw new MockError('La pasarela rechazó el pago. Revise los datos de la cuenta o use otra.', 402);

    const lineas = items.map(({ i, p }) => {
        p.stock = Math.max(0, p.stock - i.cantidad);
        return { id_producto: p.id_producto, nombre: p.nombre, categoria: p.categoria, precio: p.precio, cantidad: i.cantidad };
    });
    DB.seqPedido += 1;
    const pedido = {
        numero: 'BS-' + today().slice(0, 4) + '-' + String(DB.seqPedido).padStart(5, '0'),
        fecha: today(),
        id_usuario: u.id_usuario,
        cliente: u.nombre,
        email: u.email,
        items: lineas,
        total: lineas.reduce((s, l) => s + l.precio * l.cantidad, 0),
        direccion,
        ciudad,
        telefono,
        ultimos4: num.slice(-4)
    };
    DB.pedidos.push(pedido);
    DB.carritos[u.id_usuario] = [];
    save();
    return clone(pedido);
}

function byDateDesc(a, b) {
    if (a.fecha !== b.fecha) return a.fecha < b.fecha ? 1 : -1;
    return a.numero < b.numero ? 1 : -1;
}

export async function listMyOrders() {
    await wait(60);
    const u = currentUser();
    return clone(DB.pedidos.filter((o) => o.id_usuario === u.id_usuario).sort(byDateDesc));
}

export async function getMyOrder(numero) {
    await wait(60);
    const u = currentUser();
    const o = DB.pedidos.find((x) => x.numero === numero && x.id_usuario === u.id_usuario);
    if (!o) throw new MockError('Pedido no encontrado', 404);
    return clone(o);
}

/* ---------------- usuarios ---------------- */
export async function updateMe({ nombre, email }) {
    await wait();
    const u = currentUser();
    if (!nombre || !email) throw new MockError('Complete todos los campos.');
    if (!EMAIL_RE.test(email)) throw new MockError('Ingrese un correo electrónico válido.');
    const other = userByEmail(email);
    if (other && other !== u) throw new MockError('Ese correo ya pertenece a otra cuenta.', 409);
    u.nombre = nombre;
    u.email = email;
    DB.pedidos.forEach((o) => {
        if (o.id_usuario === u.id_usuario) {
            o.cliente = nombre;
            o.email = email;
        }
    });
    save();
    return publicUser(u);
}

export async function changePassword({ actual, nueva }) {
    await wait();
    const u = currentUser();
    if (actual !== u.password) throw new MockError('La contraseña actual no es correcta.');
    if (!nueva || nueva.length < 8) throw new MockError('La contraseña nueva debe tener al menos 8 caracteres.');
    u.password = nueva;
    save();
}

export async function listUsers() {
    await wait(60);
    requireAdmin();
    return DB.usuarios.map(publicUser);
}

export async function updateUserRole(id, rol) {
    await wait(60);
    const me = requireAdmin();
    if (me.id_usuario === id) throw new MockError('No puedes cambiar tu propio rol.', 400);
    const u = findUser(id);
    if (!u) throw new MockError('Usuario no encontrado', 404);
    u.rol = rol === 'admin' ? 'admin' : 'cliente';
    save();
    return publicUser(u);
}

export async function setUserActive(id, activo) {
    await wait(60);
    const me = requireAdmin();
    if (me.id_usuario === id) throw new MockError('No puedes desactivar tu propia cuenta.', 400);
    const u = findUser(id);
    if (!u) throw new MockError('Usuario no encontrado', 404);
    u.activo = activo;
    save();
    return publicUser(u);
}

/* ---------------- reportes (RF-21 a RF-26) ---------------- */
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export async function getDashboard({ desde, hasta, categoria }) {
    await wait(60);
    requireAdmin();
    const lineOk = (l) => categoria === 'todas' || l.categoria === categoria;
    const pedidos = DB.pedidos.filter((o) => o.fecha >= desde && o.fecha <= hasta && o.items.some(lineOk));

    let ventas = 0;
    let unidades = 0;
    const porProducto = {};
    const porMes = {};
    pedidos.forEach((o) => {
        o.items.filter(lineOk).forEach((l) => {
            const v = l.precio * l.cantidad;
            ventas += v;
            unidades += l.cantidad;
            porProducto[l.id_producto] = porProducto[l.id_producto] || { nombre: l.nombre, cantidad: 0, valor: 0 };
            porProducto[l.id_producto].cantidad += l.cantidad;
            porProducto[l.id_producto].valor += v;
            const m = o.fecha.slice(0, 7);
            porMes[m] = (porMes[m] || 0) + v;
        });
    });

    const masVendidos = Object.values(porProducto)
        .sort((a, b) => b.cantidad - a.cantidad || b.valor - a.valor)
        .slice(0, 5);

    const meses = [];
    const a = new Date(desde + 'T00:00:00');
    const b = new Date(hasta + 'T00:00:00');
    a.setDate(1);
    while (a <= b && meses.length < 14) {
        const k = isoDate(a).slice(0, 7);
        meses.push({ mes: k, etiqueta: MES[a.getMonth()] + ' ' + String(a.getFullYear()).slice(2), valor: porMes[k] || 0 });
        a.setMonth(a.getMonth() + 1);
    }

    const alertas = DB.productos
        .filter((p) => p.activo && p.stock <= 3)
        .sort((x, y) => x.stock - y.stock)
        .map((p) => ({ id_producto: p.id_producto, nombre: p.nombre, stock: p.stock }));

    return clone({
        ventas,
        pedidosCount: pedidos.length,
        unidades,
        masVendidos,
        meses,
        pedidos: pedidos.sort(byDateDesc),
        alertas
    });
}

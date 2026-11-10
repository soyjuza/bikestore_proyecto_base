const pool = require('../config/db');
const { verifyToken, huella } = require('../utils/jwt');

// Lee el token de Authorization: Bearer <token> y devuelve el usuario dueño, o null si no sirve.
// No alcanza con que la firma sea válida: se vuelve a consultar la cuenta porque desde que se
// entregó el token pudieron desactivarla, cambiarle el rol o cambiarle la contraseña.
async function usuarioDelToken(req) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return null;

    let payload;
    try {
        payload = verifyToken(header.substring(7));
    } catch {
        return null;
    }

    if (!Number.isInteger(payload.id_usuario)) return null;

    const [rows] = await pool.execute(
        'SELECT id_usuario, nombre, email, password, rol, activo FROM usuarios WHERE id_usuario = ?',
        [payload.id_usuario]
    );
    const user = rows[0];

    if (!user || !user.activo || payload.huella !== huella(user.password)) return null;

    // el rol sale de la base de datos, no del token
    return { id_usuario: user.id_usuario, nombre: user.nombre, email: user.email, rol: user.rol };
}

async function authenticate(req, res, next) {
    try {
        if (!req.headers.authorization) {
            return res.status(401).json({ ok: false, message: 'Token requerido' });
        }

        const user = await usuarioDelToken(req);
        if (!user) {
            return res.status(401).json({ ok: false, message: 'Token inválido o expirado' });
        }

        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
}

// Para rutas públicas que cambian si hay sesión (por ejemplo, ?todos=1 en productos)
async function optionalAuthenticate(req, res, next) {
    try {
        req.user = await usuarioDelToken(req);
        next();
    } catch (error) {
        next(error);
    }
}

module.exports = { authenticate, optionalAuthenticate };

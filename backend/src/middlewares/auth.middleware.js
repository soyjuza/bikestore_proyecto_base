const jwt = require('jsonwebtoken');
const env = require('../config/env');

// Valida el token JWT del encabezado Authorization: Bearer <token> y deja el usuario en req.user
function authenticate(req, res, next) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({
            ok: false,
            message: 'Token requerido'
        });
    }

    const token = header.substring(7);

    try {
        req.user = jwt.verify(token, env.jwt.secret);
        next();
    } catch {
        return res.status(401).json({
            ok: false,
            message: 'Token inválido o expirado'
        });
    }
}

// Para rutas públicas que cambian si hay sesión (por ejemplo, ?todos=1 en productos)
function optionalAuthenticate(req, res, next) {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
        try {
            req.user = jwt.verify(header.substring(7), env.jwt.secret);
        } catch {
            req.user = null;
        }
    }
    next();
}

module.exports = { authenticate, optionalAuthenticate };

const jwt = require('jsonwebtoken');
const env = require('../config/env');

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

function authorize(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user.rol)) {
            return res.status(403).json({
                ok: false,
                message: 'No tienes permisos para realizar esta operación'
            });
        }
        next();
    }
}

module.exports = { authenticate, authorize };
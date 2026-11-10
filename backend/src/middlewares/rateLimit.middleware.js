const { rateLimit } = require('express-rate-limit');
const env = require('../config/env');

function limitador({ ventanaMin, max, message, soloFallidos = false }) {
    return rateLimit({
        windowMs: ventanaMin * 60 * 1000,
        limit: max,
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: soloFallidos,
        handler: (req, res) => res.status(429).json({ ok: false, message })
    });
}

// toda la API: frena a quien manda peticiones sin parar
const limiteGeneral = limitador({
    ventanaMin: 1,
    max: env.limites.general,
    message: 'Demasiadas peticiones. Espere un momento e intente de nuevo.'
});

// inicio de sesión: solo cuentan los intentos fallidos, para que no adivinen contraseñas probando
const limiteLogin = limitador({
    ventanaMin: 15,
    max: env.limites.login,
    soloFallidos: true,
    message: 'Demasiados intentos de inicio de sesión. Espere 15 minutos e intente de nuevo.'
});

// registro y recuperación de contraseña: evita crear cuentas en masa o llenar de correos a alguien
const limiteCuenta = limitador({
    ventanaMin: 15,
    max: env.limites.cuenta,
    message: 'Demasiados intentos. Espere 15 minutos e intente de nuevo.'
});

module.exports = { limiteGeneral, limiteLogin, limiteCuenta };

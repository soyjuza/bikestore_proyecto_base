const AppError = require('../utils/AppError');

function errorHandler(error, req, res, next) {
    if (error instanceof AppError) {
        return res.status(error.status).json({
            ok: false,
            message: error.message
        });
    }

    console.error(error);

    res.status(500).json({
        ok: false,
        message: 'Error interno del servidor'
    });
}

module.exports = errorHandler;
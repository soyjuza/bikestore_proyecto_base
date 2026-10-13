const multer = require('multer');
const AppError = require('../utils/AppError');

function errorHandler(error, req, res, next) {
    if (error instanceof AppError) {
        return res.status(error.status).json({
            ok: false,
            message: error.message
        });
    }

    if (error instanceof multer.MulterError) {
        const message = error.code === 'LIMIT_FILE_SIZE'
            ? 'La imagen no puede pesar más de 2 MB'
            : 'No se pudo subir la imagen';
        return res.status(400).json({ ok: false, message });
    }

    console.error(error);

    res.status(500).json({
        ok: false,
        message: 'Error interno del servidor'
    });
}

module.exports = errorHandler;

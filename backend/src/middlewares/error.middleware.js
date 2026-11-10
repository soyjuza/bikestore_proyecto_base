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

    // errores de express.json(): el cuerpo no es JSON o pesa más de lo permitido
    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({ ok: false, message: 'El cuerpo de la petición no es un JSON válido' });
    }
    if (error.type === 'entity.too.large') {
        return res.status(413).json({ ok: false, message: 'La petición es demasiado grande' });
    }

    // el detalle queda en la consola del servidor; al cliente nunca se le manda el error de la base de datos
    console.error(error);

    res.status(500).json({
        ok: false,
        message: 'Error interno del servidor'
    });
}

module.exports = errorHandler;

const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const multer = require('multer');
const AppError = require('../utils/AppError');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'productos');
const MAX_SIZE = 2 * 1024 * 1024;

// la extensión la pone el servidor según el tipo, no se usa la que trae el archivo
const EXTENSIONES = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp'
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        cb(null, crypto.randomBytes(16).toString('hex') + EXTENSIONES[file.mimetype]);
    }
});

function fileFilter(req, file, cb) {
    if (!EXTENSIONES[file.mimetype]) {
        return cb(new AppError('Formato de imagen no permitido (solo jpg, png o webp)', 400));
    }
    cb(null, true);
}

const recibirImagen = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_SIZE, files: 1, fields: 10 }
}).single('imagen');

// El tipo que declara el navegador se puede falsificar, por eso se miran los primeros bytes del archivo
function tipoReal(bytes) {
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
    if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
    if (bytes.toString('latin1', 0, 4) === 'RIFF' && bytes.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
    return null;
}

async function borrarArchivo(file) {
    if (!file) return;
    try {
        await fs.unlink(file.path);
    } catch {
        // si ya no está en disco no hay nada que hacer
    }
}

async function verificarImagen(req, res, next) {
    if (!req.file) return next();

    try {
        const handle = await fs.open(req.file.path, 'r');
        const bytes = Buffer.alloc(12);
        await handle.read(bytes, 0, 12, 0);
        await handle.close();

        if (tipoReal(bytes) !== req.file.mimetype) {
            await borrarArchivo(req.file);
            return next(new AppError('El archivo no es una imagen válida (solo jpg, png o webp)', 400));
        }
        next();
    } catch (error) {
        await borrarArchivo(req.file);
        next(error);
    }
}

// Imagen de producto (campo «imagen» del FormData que envía el panel del administrador)
const uploadProductoImagen = [recibirImagen, verificarImagen];

module.exports = { uploadProductoImagen, borrarArchivo, UPLOAD_DIR };

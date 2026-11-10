const productsService = require('../services/products.service');
const { borrarArchivo } = require('../middlewares/upload.middleware');
const { booleano } = require('../utils/validar');

async function list(req, res, next) {
    try {
        const todos = req.query.todos === '1' && req.user?.rol === 'admin';
        const data = await productsService.listProducts({
            incluirInactivos: todos,
            categoria: req.query.categoria,
            orden: req.query.orden,
            q: req.query.q
        });
        res.json({ ok: true, data });
    } catch (error) {
        next(error);
    }
}

async function getById(req, res, next) {
    try {
        const data = await productsService.getProductById(req.params.id, { soloActivos: true });
        res.json({ ok: true, data });
    } catch (error) {
        next(error);
    }
}

async function create(req, res, next) {
    try {
        const data = await productsService.createProduct(req.body, req.file?.filename);
        res.status(201).json({ ok: true, data });
    } catch (error) {
        // si los datos no pasaron la validación, la imagen que ya se había subido no se deja guardada
        await borrarArchivo(req.file);
        next(error);
    }
}

async function update(req, res, next) {
    try {
        const data = await productsService.updateProduct(req.params.id, req.body, req.file?.filename);
        res.json({ ok: true, data });
    } catch (error) {
        await borrarArchivo(req.file);
        next(error);
    }
}

async function setActive(req, res, next) {
    try {
        const activo = booleano(req.body.activo, 'Indique si el producto queda activo (true) o inactivo (false).');
        const data = await productsService.setProductActive(req.params.id, activo);
        res.json({ ok: true, data });
    } catch (error) {
        next(error);
    }
}

module.exports = { list, getById, create, update, setActive };

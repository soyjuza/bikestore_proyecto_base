const productsService = require('../services/products.service');

async function list(req, res, next) {
    try {
        const todos = req.query.todos === '1' && req.user?.rol === 'admin';
        const data = await productsService.listProducts({ incluirInactivos: todos });
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
        next(error);
    }
}

async function update(req, res, next) {
    try {
        const data = await productsService.updateProduct(req.params.id, req.body, req.file?.filename);
        res.json({ ok: true, data });
    } catch (error) {
        next(error);
    }
}

async function setActive(req, res, next) {
    try {
        const data = await productsService.setProductActive(req.params.id, Boolean(req.body.activo));
        res.json({ ok: true, data });
    } catch (error) {
        next(error);
    }
}

module.exports = { list, getById, create, update, setActive };

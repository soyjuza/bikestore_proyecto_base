const ordersService = require('../services/orders.service');

async function create(req, res, next) {
    try {
        const data = await ordersService.createOrder(req.user.id_usuario, req.body);
        res.status(201).json({ ok: true, data });
    } catch (error) {
        next(error);
    }
}

async function listMine(req, res, next) {
    try {
        const data = await ordersService.listUserOrders(req.user.id_usuario);
        res.json({ ok: true, data });
    } catch (error) {
        next(error);
    }
}

async function getMine(req, res, next) {
    try {
        const data = await ordersService.getUserOrder(req.user.id_usuario, req.params.numero);
        res.json({ ok: true, data });
    } catch (error) {
        next(error);
    }
}

module.exports = { create, listMine, getMine };

const cartService = require('../services/cart.service');

async function get(req, res, next) {
    try {
        const data = await cartService.getCart(req.user.id_usuario);
        res.json({ ok: true, data });
    } catch (error) {
        next(error);
    }
}

async function replace(req, res, next) {
    try {
        const data = await cartService.replaceCart(req.user.id_usuario, req.body.items || []);
        res.json({ ok: true, data });
    } catch (error) {
        next(error);
    }
}

module.exports = { get, replace };

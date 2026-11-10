const usersService = require('../services/users.service');
const { booleano } = require('../utils/validar');

async function updateMe(req, res, next) {
    try {
        const data = await usersService.updateProfile(req.user.id_usuario, req.body);
        res.json({ ok: true, data });
    } catch (error) {
        next(error);
    }
}

async function changePassword(req, res, next) {
    try {
        const { token } = await usersService.changePassword(req.user.id_usuario, req.body);
        res.json({ ok: true, message: 'Contraseña cambiada', token });
    } catch (error) {
        next(error);
    }
}

async function list(req, res, next) {
    try {
        const data = await usersService.listUsers({ q: req.query.q });
        res.json({ ok: true, data });
    } catch (error) {
        next(error);
    }
}

async function setRole(req, res, next) {
    try {
        const data = await usersService.setRole(req.user.id_usuario, req.params.id, req.body.rol);
        res.json({ ok: true, data });
    } catch (error) {
        next(error);
    }
}

async function setActive(req, res, next) {
    try {
        const activo = booleano(req.body.activo, 'Indique si la cuenta queda activa (true) o desactivada (false).');
        const data = await usersService.setActive(req.user.id_usuario, req.params.id, activo);
        res.json({ ok: true, data });
    } catch (error) {
        next(error);
    }
}

module.exports = { updateMe, changePassword, list, setRole, setActive };

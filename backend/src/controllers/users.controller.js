const usersService = require('../services/users.service');

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
        await usersService.changePassword(req.user.id_usuario, req.body);
        res.json({ ok: true, message: 'Contraseña cambiada' });
    } catch (error) {
        next(error);
    }
}

async function list(req, res, next) {
    try {
        const data = await usersService.listUsers();
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
        const data = await usersService.setActive(req.user.id_usuario, req.params.id, Boolean(req.body.activo));
        res.json({ ok: true, data });
    } catch (error) {
        next(error);
    }
}

module.exports = { updateMe, changePassword, list, setRole, setActive };

const express = require('express');
const controller = require('../controllers/users.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { limiteLogin } = require('../middlewares/rateLimit.middleware');

const router = express.Router();

router.use(authenticate);

// cuenta propia
router.put('/me', controller.updateMe);
// mismo límite del inicio de sesión: con una sesión robada no se puede adivinar la contraseña actual probando
router.put('/me/password', limiteLogin, controller.changePassword);

// administración (RF-27..31)
router.get('/', authorize('admin'), controller.list);                  // ?q=texto busca por nombre o correo
router.patch('/:id/rol', authorize('admin'), controller.setRole);
router.patch('/:id/estado', authorize('admin'), controller.setActive);

module.exports = router;

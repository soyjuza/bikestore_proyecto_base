const express = require('express');
const controller = require('../controllers/orders.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.post('/', controller.create);              // RF-09..12: pago simulado + número único
router.get('/mine', controller.listMine);         // historial del cliente
router.get('/mine/:numero', controller.getMine);  // detalle de un pedido propio

module.exports = router;

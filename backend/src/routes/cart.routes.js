const express = require('express');
const controller = require('../controllers/cart.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

// El carrito queda guardado en la cuenta del cliente (RF-08)
router.use(authenticate);

router.get('/', controller.get);
router.put('/', controller.replace);   // body: { items: [{ id_producto, cantidad }] }

module.exports = router;

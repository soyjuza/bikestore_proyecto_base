const express = require('express');
const controller = require('../controllers/products.controller');
const { authenticate, optionalAuthenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { uploadProductoImagen } = require('../middlewares/upload.middleware');

const router = express.Router();

// públicas: el catálogo se consulta sin cuenta (RF-01..05). ?todos=1 incluye inactivos solo para admin.
router.get('/', optionalAuthenticate, controller.list);
router.get('/:id', controller.getById);

// solo admin (RF-17..20)
router.post('/', authenticate, authorize('admin'), uploadProductoImagen, controller.create);
router.put('/:id', authenticate, authorize('admin'), uploadProductoImagen, controller.update);
router.patch('/:id/estado', authenticate, authorize('admin'), controller.setActive);

module.exports = router;

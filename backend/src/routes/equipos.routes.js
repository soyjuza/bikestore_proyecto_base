const express = require('express');
const controller = require('../controllers/equipos.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { uploadEquipoImagen } = require('../middlewares/upload.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getById);

//admin y cliente pueden crear/editar en este ejemplo
router.post('/', authorize('admin', 'cliente'), uploadEquipoImagen, controller.create);
router.put('/:id', authorize('admin', 'cliente'), uploadEquipoImagen, controller.update);


//solo admin puede eliminar.
router.delete('/:id', authorize('admin'), controller.remove);

module.exports = router;
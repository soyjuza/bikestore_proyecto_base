const express = require('express');
const controller = require('../controllers/users.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

const router = express.Router();

router.use(authenticate);

// cuenta propia
router.put('/me', controller.updateMe);
router.put('/me/password', controller.changePassword);

// administración (RF-27..31)
router.get('/', authorize('admin'), controller.list);
router.patch('/:id/rol', authorize('admin'), controller.setRole);
router.patch('/:id/estado', authorize('admin'), controller.setActive);

module.exports = router;

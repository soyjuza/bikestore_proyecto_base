const express = require('express');
const controller = require('../controllers/reports.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

const router = express.Router();

router.use(authenticate, authorize('admin'));

// query: ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&categoria=todas|montana|...
router.get('/dashboard', controller.dashboard);       // RF-21..25
router.get('/export/excel', controller.exportExcel);  // RF-26
router.get('/export/pdf', controller.exportPdf);      // RF-26

module.exports = router;

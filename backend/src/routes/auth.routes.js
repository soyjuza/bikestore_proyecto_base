const express = require("express");
const controller = require("../controllers/auth.controller");
const { limiteLogin, limiteCuenta } = require("../middlewares/rateLimit.middleware");

const router = express.Router();

router.post("/register", limiteCuenta, controller.register);       // RF-13, RF-14
router.post("/login", limiteLogin, controller.login);              // RF-15
router.post("/recover", limiteCuenta, controller.requestReset);    // RF-16: envía el enlace al correo
router.get("/reset/:token", controller.checkReset);                // RF-16: valida el enlace al abrirlo
router.post("/reset", limiteCuenta, controller.resetPassword);     // RF-16: guarda la contraseña nueva

module.exports = router;

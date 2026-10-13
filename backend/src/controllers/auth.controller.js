const authService = require("../services/auth.service");

async function register(req, res, next) {
  try {
    const { id_usuario } = await authService.registerUser(req.body);
    res.status(201).json({ ok: true, message: "Usuario registrado", id_usuario });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { user, token } = await authService.loginUser(req.body);
    res.json({ ok: true, user, token });
  } catch (error) {
    next(error);
  }
}

async function requestReset(req, res, next) {
  try {
    await authService.requestPasswordReset(req.body.email);
    res.json({ ok: true, message: "Le enviamos un enlace a su correo para recuperar la contraseña." });
  } catch (error) {
    next(error);
  }
}

async function checkReset(req, res, next) {
  try {
    await authService.checkResetToken(req.params.token);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    await authService.resetPassword(req.body.token, req.body.password);
    res.json({ ok: true, message: "Su contraseña fue actualizada." });
  } catch (error) {
    next(error);
  }
}

module.exports = { register, login, requestReset, checkReset, resetPassword };

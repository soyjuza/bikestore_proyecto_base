const AppError = require("./AppError");

// Marca los servicios que aún falta programar. Responde 501 para que el frontend muestre un mensaje claro.
function notImplemented(name) {
  throw new AppError(`${name}: pendiente de implementar en el backend`, 501);
}

module.exports = notImplemented;

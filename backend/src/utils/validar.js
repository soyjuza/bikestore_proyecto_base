const AppError = require("./AppError");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Devuelve el texto sin espacios a los lados, o "" si no llegó un texto.
// Así un arreglo o un objeto en el JSON no llega nunca a la consulta.
function texto(valor) {
  return typeof valor === "string" ? valor.trim() : "";
}

function correo(valor) {
  return texto(valor).toLowerCase();
}

function esCorreo(valor) {
  return valor.length <= 150 && EMAIL_RE.test(valor);
}

// La contraseña no se recorta. bcrypt solo usa los primeros 72 bytes, por eso el máximo.
function esPassword(valor) {
  return typeof valor === "string" && valor.length >= 8 && Buffer.byteLength(valor) <= 72;
}

// "15" o 15 -> 15. Cualquier otra cosa -> null
function enteroPositivo(valor) {
  if (typeof valor === "number" && Number.isInteger(valor) && valor > 0) return valor;
  if (typeof valor === "string" && /^[1-9]\d{0,9}$/.test(valor)) return Number(valor);
  return null;
}

function booleano(valor, mensaje) {
  if (typeof valor !== "boolean") {
    throw new AppError(mensaje, 400);
  }
  return valor;
}

// 2026-08-01 y que además exista en el calendario
function esFecha(valor) {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(valor + "T00:00:00Z");
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

// Para buscar con LIKE sin que % y _ del usuario funcionen como comodines
function escaparLike(valor) {
  return valor.replace(/[\\%_]/g, "\\$&");
}

module.exports = { texto, correo, esCorreo, esPassword, enteroPositivo, booleano, esFecha, escaparLike };

const path = require("path");
const { escaparHtml } = require("./validar");

/* Correos de BikeStore en HTML.
   Los programas de correo (Gmail, Outlook) no entienden el CSS moderno, por eso todo va en tablas
   y con los estilos escritos en cada etiqueta. Cada correo trae también su versión en texto plano.
   El logo va adjunto dentro del mismo correo (cid), así se ve aunque la página no esté publicada. */

const LOGO_CID = "logo-bikestore";
const LOGO = {
  filename: "logo-bikestore.png",
  path: path.join(__dirname, "..", "..", "assets", "correo", "logo-bikestore.png"),
  cid: LOGO_CID,
};

const C = {
  fondo: "#EEEFEE",
  tarjeta: "#FFFFFF",
  texto: "#15181B",
  suave: "#4A5157",
  tenue: "#7A8188",
  linea: "#DCDFDF",
  rojo: "#C1272D",
};
const FUENTE = "Arial, Helvetica, sans-serif";

function fechaColombia(fecha = new Date()) {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "long",
    timeStyle: "short",
  }).format(fecha);
}

function boton(url, texto) {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px">
    <tr><td bgcolor="${C.texto}" style="border-radius:6px">
      <a href="${url}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FUENTE};font-size:15px;font-weight:bold;color:#FFFFFF;text-decoration:none;border-radius:6px">${texto}</a>
    </td></tr>
  </table>`;
}

function parrafo(html, estilo = "") {
  return `<p style="margin:0 0 16px;font-family:${FUENTE};font-size:15px;line-height:1.6;color:${C.suave};${estilo}">${html}</p>`;
}

// Marco común: encabezado con el logo, el contenido y el pie.
function marco({ previa, titulo, cuerpo }) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${titulo}</title>
</head>
<body style="margin:0;padding:0;background:${C.fondo}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${previa}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.fondo}">
  <tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
      <tr><td style="padding:0 4px 20px">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="padding-right:12px"><img src="cid:${LOGO_CID}" width="31" height="44" alt="" style="display:block;border:0"></td>
          <td style="font-family:${FUENTE};font-size:22px;font-weight:bold;letter-spacing:-0.5px;color:${C.texto}">BikeStore</td>
        </tr></table>
      </td></tr>
      <tr><td bgcolor="${C.tarjeta}" style="border:1px solid ${C.linea};border-radius:6px;border-top:3px solid ${C.rojo}">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding:36px 36px 28px">
            <h1 style="margin:0 0 20px;font-family:${FUENTE};font-size:24px;line-height:1.25;color:${C.texto}">${titulo}</h1>
            ${cuerpo}
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:20px 4px 0;font-family:${FUENTE};font-size:12px;line-height:1.6;color:${C.tenue}">
        Este es un correo automático de BikeStore, por favor no lo respondas.<br>
        Por tu seguridad, BikeStore nunca te pedirá tu contraseña por correo, teléfono ni mensaje.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// RF-16: enlace para crear una contraseña nueva
function correoRecuperacion({ nombre, enlace, minutos }) {
  const n = escaparHtml(nombre);
  const asunto = "Recupera tu contraseña de BikeStore";
  const html = marco({
    previa: `Usa este enlace para crear una contraseña nueva. Vence en ${minutos} minutos.`,
    titulo: "Crea una contraseña nueva",
    cuerpo:
      parrafo(`Hola, <b style="color:${C.texto}">${n}</b>.`) +
      parrafo("Recibimos una solicitud para cambiar la contraseña de tu cuenta de BikeStore. Para crear una nueva, usa este botón:") +
      boton(enlace, "Crear contraseña nueva") +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0">
        <tr><td bgcolor="#F4F5F5" style="padding:14px 16px;border-radius:6px;font-family:${FUENTE};font-size:13.5px;line-height:1.6;color:${C.suave}">
          El enlace <b style="color:${C.texto}">vence en ${minutos} minutos</b> y <b style="color:${C.texto}">sirve una sola vez</b>.
          Si pides otro, este deja de funcionar.
        </td></tr>
      </table>` +
      parrafo("<b>¿No fuiste tú?</b> Ignora este correo. Tu contraseña sigue siendo la misma y nadie puede cambiarla sin este enlace.") +
      `<p style="margin:24px 0 0;padding-top:20px;border-top:1px solid ${C.linea};font-family:${FUENTE};font-size:12.5px;line-height:1.6;color:${C.tenue}">
        Si el botón no funciona, copia este enlace y pégalo en tu navegador:<br>
        <a href="${enlace}" style="color:${C.texto};word-break:break-all">${enlace}</a>
      </p>`,
  });
  const texto =
    `Hola, ${nombre}.\n\n` +
    "Recibimos una solicitud para cambiar la contraseña de tu cuenta de BikeStore. " +
    `Abre este enlace para crear una contraseña nueva:\n\n${enlace}\n\n` +
    `El enlace vence en ${minutos} minutos y sirve una sola vez. ` +
    "Si no fuiste tú, ignora este correo: tu contraseña sigue siendo la misma.\n\n" +
    "BikeStore nunca te pedirá tu contraseña por correo, teléfono ni mensaje.";
  return { asunto, texto, html, adjuntos: [LOGO] };
}

// Aviso después de cambiar la contraseña, por si no fue el dueño de la cuenta
function correoContrasenaCambiada({ nombre, enlaceRecuperar, fecha = new Date() }) {
  const n = escaparHtml(nombre);
  const cuando = fechaColombia(fecha);
  const asunto = "Tu contraseña de BikeStore fue cambiada";
  const html = marco({
    previa: `La contraseña de tu cuenta se cambió el ${cuando}.`,
    titulo: "Tu contraseña fue cambiada",
    cuerpo:
      parrafo(`Hola, <b style="color:${C.texto}">${n}</b>.`) +
      parrafo(`La contraseña de tu cuenta de BikeStore se cambió el <b style="color:${C.texto}">${cuando}</b> (hora de Colombia). Por seguridad, cerramos las sesiones que estaban abiertas.`) +
      parrafo("Si fuiste tú, no tienes que hacer nada más.") +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0">
        <tr><td style="padding:16px;border:1px solid ${C.rojo};border-radius:6px;font-family:${FUENTE};font-size:14px;line-height:1.6;color:${C.suave}">
          <b style="color:${C.rojo}">¿No fuiste tú?</b> Alguien pudo entrar a tu cuenta. Crea una contraseña nueva ahora mismo:
          <br><a href="${enlaceRecuperar}" style="color:${C.texto};font-weight:bold">Recuperar mi cuenta</a>
        </td></tr>
      </table>`,
  });
  const texto =
    `Hola, ${nombre}.\n\n` +
    `La contraseña de tu cuenta de BikeStore se cambió el ${cuando} (hora de Colombia). ` +
    "Por seguridad, cerramos las sesiones que estaban abiertas.\n\n" +
    "Si fuiste tú, no tienes que hacer nada más.\n\n" +
    `¿No fuiste tú? Crea una contraseña nueva ahora mismo: ${enlaceRecuperar}`;
  return { asunto, texto, html, adjuntos: [LOGO] };
}

module.exports = { correoRecuperacion, correoContrasenaCambiada };

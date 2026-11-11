const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const env = require("../config/env");

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: env.mail.port === 465,
      // con el puerto 587 la conexión empieza normal y se cifra con STARTTLS; se exige que se cifre
      requireTLS: env.mail.port !== 465,
      auth: env.mail.user ? { user: env.mail.user, pass: env.mail.password } : undefined,
    });
  }
  return transporter;
}

const CARPETA_PRUEBA = path.join(__dirname, "..", "..", "correos-de-prueba");

// Sin servidor de correo, el HTML se guarda en backend/correos-de-prueba para poder verlo en el navegador.
// Las imágenes adjuntas (cid) se meten dentro del archivo para que se vean al abrirlo.
function guardarCopia({ para, asunto, html, adjuntos = [] }) {
  let pagina = html;
  for (const a of adjuntos) {
    const datos = fs.readFileSync(a.path).toString("base64");
    pagina = pagina.split(`cid:${a.cid}`).join(`data:image/png;base64,${datos}`);
  }
  fs.mkdirSync(CARPETA_PRUEBA, { recursive: true });
  const hora = new Date().toISOString().replace(/[:.]/g, "-");
  const nombre = `${hora}-${para.replace(/[^a-z0-9]+/gi, "_")}.html`;
  const archivo = path.join(CARPETA_PRUEBA, nombre);
  fs.writeFileSync(archivo, pagina);
  return archivo;
}

// Envía un correo. Si no hay servidor SMTP configurado (lo normal en el computador de cada uno),
// el mensaje se imprime en la consola y el HTML queda guardado para poder seguir probando.
async function enviarCorreo({ para, asunto, texto, html, adjuntos = [] }) {
  if (!env.mail.host) {
    if (env.nodeEnv !== "test") {
      const copia = html ? guardarCopia({ para, asunto, html, adjuntos }) : null;
      console.log(
        `\n--- Correo para ${para} (SMTP sin configurar) ---\n${asunto}\n\n${texto}\n` +
          (copia ? `\nVista del correo: ${copia}\n` : "") +
          "---\n",
      );
    }
    return;
  }

  await getTransporter().sendMail({
    from: env.mail.from,
    to: para,
    subject: asunto,
    text: texto,
    html,
    attachments: adjuntos,
  });
}

module.exports = { enviarCorreo };

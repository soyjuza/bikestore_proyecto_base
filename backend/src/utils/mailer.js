const nodemailer = require("nodemailer");
const env = require("../config/env");

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: env.mail.port === 465,
      auth: env.mail.user ? { user: env.mail.user, pass: env.mail.password } : undefined,
    });
  }
  return transporter;
}

// Envía un correo. Si no hay servidor SMTP configurado (lo normal en el computador de cada uno),
// el mensaje se imprime en la consola para poder copiar el enlace y seguir probando.
async function enviarCorreo({ para, asunto, texto }) {
  if (!env.mail.host) {
    if (env.nodeEnv !== "test") {
      console.log(`\n--- Correo para ${para} (SMTP sin configurar) ---\n${asunto}\n\n${texto}\n---\n`);
    }
    return;
  }

  await getTransporter().sendMail({ from: env.mail.from, to: para, subject: asunto, text: texto });
}

module.exports = { enviarCorreo };

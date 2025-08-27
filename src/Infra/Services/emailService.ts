import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "localhost",
  port: 1025,
  secure: false, // MailHog não usa TLS
});

export async function sendEmail(to: string, subject: string, text: string) {
  const mailOptions = {
    from: "no-reply@meusite.com",
    to,
    subject,
    text,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email enviado para ${to}`);
  } catch (err) {
    console.error("Erro ao enviar email:", err);
  }
}

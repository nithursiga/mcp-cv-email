import nodemailer from "nodemailer";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const host = process.env.SMTP_HOST!;
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER!;
  const pass = process.env.SMTP_PASS!;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass) {
    throw new Error("SMTP env vars missing.");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const info = await transporter.sendMail({ from, to, subject, html });
  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
  };
}

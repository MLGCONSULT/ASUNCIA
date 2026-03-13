import nodemailer from "nodemailer";
import { logger } from "./logger.js";
import { textToHtml, wrapAsuncIAHtml } from "./email-templates.js";

function getTransporter() {
  const host = process.env.EMAIL_HOST?.trim();
  const port = process.env.EMAIL_PORT?.trim();
  const user = process.env.EMAIL_HOST_USER?.trim();
  const pass = process.env.EMAIL_HOST_PASSWORD?.trim();
  if (!host || !port || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port: Number(port),
    secure: process.env.EMAIL_USE_TLS !== "true",
    auth: { user, pass },
  });
}

function getFromAddress(): string {
  const addr = process.env.DEFAULT_FROM_EMAIL || process.env.EMAIL_HOST_USER;
  return `AsuncIA <${addr || "noreply@asuncia.local"}>`;
}

export type SendEmailOptions = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  wrapInLayout?: boolean;
  layoutTitle?: string;
};

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) {
    logger.warn("email", "SMTP non configuré. Email non envoyé.");
    return false;
  }
  let html = options.html;
  let text = options.text;
  if (options.wrapInLayout) {
    const rawContent = options.html ?? (options.text ? textToHtml(options.text) : "");
    html = wrapAsuncIAHtml(rawContent, options.layoutTitle);
    if (!options.html && options.text) text = options.text;
  }
  try {
    await transporter.sendMail({
      from: getFromAddress(),
      to: options.to,
      subject: options.subject,
      text,
      html,
    });
    return true;
  } catch (err) {
    logger.error("email", "Erreur envoi", err);
    return false;
  }
}

export type SendStyledEmailOptions = { to: string; subject: string; htmlBody: string; title?: string };
export async function sendStyledEmail(options: SendStyledEmailOptions): Promise<boolean> {
  return sendEmail({
    to: options.to,
    subject: options.subject,
    html: wrapAsuncIAHtml(options.htmlBody, options.title),
  });
}

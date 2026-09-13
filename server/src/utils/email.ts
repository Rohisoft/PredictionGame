import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let transporter: import("nodemailer").Transporter | null = null;

function getTransporter() {
  if (!env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

export async function sendPasswordResetEmail(toEmail: string, resetUrl: string) {
  const client = getTransporter();

  if (!client) {
    // Dev-only fallback so the flow is testable without SMTP configured.
    console.log(`[email] Password reset link for ${toEmail}: ${resetUrl}`);
    return;
  }

  await client.sendMail({
    from: env.SMTP_FROM ?? "no-reply@example.com",
    to: toEmail,
    subject: "Reset your Odd/Even password",
    text: `Reset your password: ${resetUrl}\n\nIf you didn't request this, ignore this email.`,
  });
}

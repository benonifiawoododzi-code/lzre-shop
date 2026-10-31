import { prisma } from "@/lib/db";
import { log } from "@/lib/log";

export type EmailMessage = {
  to: string;
  subject: string;
  body: string;
  template: string;
};

export function emailConfigured() {
  return process.env.EMAIL_PROVIDER === "resend" && Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(message: EmailMessage) {
  if (emailConfigured()) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "LZRE <orders@example.com>",
          to: message.to,
          subject: message.subject,
          text: message.body,
        }),
      });
      if (!response.ok) {
        const error = await response.text();
        await prisma.emailOutbox.create({ data: { ...message, status: "failed", error: error.slice(0, 500) } });
        return { delivered: false, detail: "The email provider rejected the message." };
      }
      await prisma.emailOutbox.create({ data: { ...message, status: "sent" } });
      return { delivered: true, detail: "Email sent." };
    } catch (error) {
      log("error", "email.send_failed", { template: message.template });
      await prisma.emailOutbox.create({ data: { ...message, status: "failed", error: error instanceof Error ? error.message : "send failed" } });
      return { delivered: false, detail: "The email provider could not be reached." };
    }
  }

  await prisma.emailOutbox.create({ data: { ...message, status: "logged" } });
  if (process.env.NODE_ENV === "development" && process.env.SHOW_DEV_LINKS === "true") {
    log("info", "email.logged", { to: message.to, template: message.template, subject: message.subject });
  }
  return { delivered: false, detail: "Email delivery is not configured. The message was saved and was not sent." };
}

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/send";
import { contactSchema, newsletterSchema, privacyRequestSchema } from "@/lib/validation/schemas";

export async function subscribeNewsletterAction(formData: FormData) {
  const parsed = newsletterSchema.safeParse({ email: formData.get("email"), consent: formData.get("consent") === "true" });
  if (!parsed.success) return;
  await prisma.newsletterSubscriber.upsert({
    where: { email: parsed.data.email },
    update: { consent: true },
    create: { email: parsed.data.email, consent: true },
  });
  await sendEmail({
    to: parsed.data.email,
    template: "newsletter",
    subject: "LZRE Books newsletter",
    body: "Your email was saved on LZRE Books. This message is only delivered when an email provider is configured.",
  });
  revalidatePath("/");
}

export async function contactAction(_state: { message: string }, formData: FormData) {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    topic: formData.get("topic"),
    message: formData.get("message"),
  });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Check the form." };
  await prisma.contactMessage.create({ data: parsed.data });
  return { message: "Message saved. It was not emailed unless an email provider is configured." };
}

export async function privacyRequestAction(formData: FormData) {
  const parsed = privacyRequestSchema.safeParse({
    email: formData.get("email"),
    type: formData.get("type"),
    detail: formData.get("detail") ?? "",
  });
  if (!parsed.success) return;
  await prisma.privacyRequest.create({ data: { email: parsed.data.email, type: parsed.data.type } });
}

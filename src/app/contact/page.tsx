import type { Metadata } from "next";
import { ContactForm } from "@/components/content/contact-form";
import { privacyRequestAction } from "@/actions/content";
import { prisma } from "@/lib/db";
import { brandDefaults } from "@/config/site";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage() {
  const site = await prisma.siteConfiguration.findUnique({ where: { id: "default" } }).catch(() => null);
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 md:grid-cols-2">
      <div>
        <h1 className="font-display text-4xl text-navy">Contact</h1>
        <p className="mt-3 text-muted">{site?.address ?? brandDefaults.address}</p>
        <p className="mt-2">{site?.supportEmail ?? brandDefaults.supportEmail}</p>
        <p>{site?.phone ?? brandDefaults.phone}</p>
        <div className="mt-8"><ContactForm /></div>
      </div>
      <form action={privacyRequestAction} className="grid content-start gap-3">
        <h2 className="font-display text-2xl">Privacy request</h2>
        <p className="text-sm text-muted">Ask for a copy of your account data or for deletion. The request is stored for an administrator. It is not completed automatically.</p>
        <input className="h-11 border border-line px-3" name="email" placeholder="Email" required type="email" />
        <select className="h-11 border border-line px-2" name="type"><option value="export">Export</option><option value="deletion">Deletion</option></select>
        <button className="h-11 border border-navy" type="submit">Submit request</button>
      </form>
    </div>
  );
}

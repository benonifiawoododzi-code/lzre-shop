import { saveSiteAction } from "@/actions/admin";
import { prisma } from "@/lib/db";

export const metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const [site, taxes] = await Promise.all([
    prisma.siteConfiguration.findUnique({ where: { id: "default" } }),
    prisma.taxComponent.findMany({ orderBy: { sequence: "asc" } }),
  ]);
  if (!site) return <p>Seed the database before editing settings.</p>;
  return (
    <div>
      <h1 className="font-display text-4xl text-navy">Settings</h1>
      <form action={saveSiteAction} className="mt-6 grid max-w-lg gap-2">
        <input className="h-11 border border-line px-2" defaultValue={site.marketplaceName} name="marketplaceName" />
        <input className="h-11 border border-line px-2" defaultValue={site.tagline} name="tagline" />
        <input className="h-11 border border-line px-2" defaultValue={site.currency} name="currency" />
        <input className="h-11 border border-line px-2" defaultValue={site.country} name="country" />
        <input className="h-11 border border-line px-2" defaultValue={site.commissionRate.toString()} name="commissionRate" />
        <input className="h-11 border border-line px-2" defaultValue={site.supportEmail} name="supportEmail" />
        <input className="h-11 border border-line px-2" defaultValue={site.phone} name="phone" />
        <input className="h-11 border border-line px-2" defaultValue={site.address} name="address" />
        <input className="h-11 border border-line px-2" defaultValue={site.announcement} name="announcement" />
        <label className="flex gap-2"><input defaultChecked={site.announcementActive} name="announcementActive" type="checkbox" value="true" /> Show announcement</label>
        <select className="h-11 border border-line" defaultValue={site.mode} name="mode"><option value="MULTI_VENDOR">Multi-vendor</option><option value="SINGLE_MERCHANT">Single merchant</option></select>
        <button type="submit">Save settings</button>
      </form>
      <h2 className="mt-8 font-display text-2xl">Tax components</h2>
      {taxes.map((tax) => <p className="mt-2" key={tax.id}>{tax.name} {tax.ratePercent.toString()}% {tax.demonstration ? "(demonstration)" : ""}</p>)}
    </div>
  );
}

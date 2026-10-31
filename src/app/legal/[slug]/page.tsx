import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await prisma.cmsPage.findUnique({ where: { slug } });
  return { title: page?.title ?? "Page", description: page?.description };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await prisma.cmsPage.findFirst({ where: { slug, published: true } });
  if (!page) notFound();
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-4xl text-navy">{page.title}</h1>
      <div className="mt-6 grid gap-4">
        {page.body.split(/\n\n+/).map((block) => block.startsWith("## ")
          ? <h2 className="font-display text-2xl" key={block}>{block.slice(3)}</h2>
          : <p key={block.slice(0, 40)}>{block}</p>)}
      </div>
    </article>
  );
}

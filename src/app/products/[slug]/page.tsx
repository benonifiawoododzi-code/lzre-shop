import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCardView } from "@/components/catalog/product-card";
import { RememberProduct } from "@/components/catalog/recently-viewed";
import { BuyBox } from "@/components/products/buy-box";
import { Gallery } from "@/components/products/gallery";
import { Rating } from "@/components/ui/rating";
import { askQuestionAction, createReviewAction } from "@/actions/account";
import { getProductBySlug, relatedProducts } from "@/lib/catalog/browse";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { cedisToPesewas, discountPercent } from "@/lib/pricing/money";
import type { ProductCard } from "@/types/catalog";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product" };
  return { title: product.metaTitle || product.name, description: product.metaDescription || product.description.slice(0, 160) };
}

export default async function ProductPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ review?: string }> }) {
  const { slug } = await params;
  const query = await searchParams;
  const product = await getProductBySlug(slug);
  if (!product || !product.seller.store) notFound();
  const user = await getCurrentUser();
  const related = await relatedProducts(product.id, product.categoryId, product.sellerId);
  const images = product.images.length > 0 ? product.images.map((image) => ({ url: image.url, alt: image.alt })) : [{ url: `/demo-image/${product.slug}`, alt: product.name }];
  const variants = product.variants.map((variant) => ({
    id: variant.id,
    name: variant.name,
    pricePesewas: cedisToPesewas(variant.price.toString()),
    comparePesewas: variant.compareAtPrice ? cedisToPesewas(variant.compareAtPrice.toString()) : null,
    available: variant.inventory?.available ?? 0,
    options: (variant.options ?? {}) as Record<string, string>,
  }));
  const eligible = user
    ? await prisma.orderItem.findFirst({
        where: {
          productId: product.id,
          review: { is: null },
          order: { userId: user.id, OR: [{ paymentStatus: { in: ["PAID", "COD_COLLECTED"] } }, { status: "DELIVERED" }] },
        },
      })
    : null;
  const reviews = query.review === "helpful"
    ? [...product.reviews].sort((a, b) => b.helpfulCount - a.helpfulCount)
    : query.review === "low"
      ? [...product.reviews].sort((a, b) => a.rating - b.rating)
      : query.review === "high"
        ? [...product.reviews].sort((a, b) => b.rating - a.rating)
        : product.reviews;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: images.map((image) => image.url),
    sku: product.variants[0]?.sku,
    brand: product.brand ? { "@type": "Brand", name: product.brand.name } : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: product.currency,
      price: product.fromPrice.toString(),
      availability: variants.some((variant) => variant.available > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <article className="mx-auto max-w-6xl px-4 py-8">
      <RememberProduct id={product.id} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-sm text-muted"><Link href="/">Home</Link> / <Link href={`/categories/${product.category.slug}`}>{product.category.name}</Link> / {product.name}</p>
      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <Gallery images={images} />
        <div>
          {product.brand ? <Link className="text-xs uppercase tracking-[0.14em] text-muted" href={`/brands/${product.brand.slug}`}>{product.brand.name}</Link> : null}
          <h1 className="mt-2 font-display text-4xl text-navy">{product.name}</h1>
          <div className="mt-3"><Rating count={product.ratingCount} value={Number(product.ratingAverage)} /></div>
          <p className="mt-3 text-sm">Sold by <Link className="underline-offset-4 hover:underline" href={`/stores/${product.seller.store.slug}`}>{product.seller.store.name}</Link></p>
          <p className="mt-1 text-sm text-muted">SKU {product.variants[0]?.sku} · {product.condition.toLowerCase()}</p>
          {variants[0] ? <p className="mt-2 text-sm text-success">{discountPercent(variants[0].pricePesewas, variants[0].comparePesewas) ? `${discountPercent(variants[0].pricePesewas, variants[0].comparePesewas)}% off the compare price` : null}</p> : null}
          <div className="mt-6"><BuyBox currency={product.currency} productId={product.id} variants={variants} /></div>
          <div className="mt-6 border-t border-line pt-4 text-sm text-muted">
            <p>Delivery is calculated at checkout for your Ghana region. Estimates appear only for configured methods.</p>
            <p className="mt-2"><Link href="/legal/returns">Returns policy</Link>. Weight {product.weightGrams} g.</p>
          </div>
        </div>
      </div>
      <section className="mt-12 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl">Description</h2>
          {product.description.split(/\n\n+/).map((paragraph) => <p className="mt-3" key={paragraph.slice(0, 24)}>{paragraph}</p>)}
        </div>
        <div>
          <h2 className="font-display text-2xl">Specifications</h2>
          <dl className="mt-3">
            {product.attributes.map((attribute) => (
              <div className="grid grid-cols-2 border-b border-line py-2 text-sm" key={attribute.id}>
                <dt>{attribute.name}</dt>
                <dd>{attribute.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      <section className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl">Reviews</h2>
          <div className="flex gap-3 text-sm">
            <Link href={`/products/${product.slug}?review=newest`}>Newest</Link>
            <Link href={`/products/${product.slug}?review=high`}>Highest</Link>
            <Link href={`/products/${product.slug}?review=low`}>Lowest</Link>
            <Link href={`/products/${product.slug}?review=helpful`}>Helpful</Link>
          </div>
        </div>
        {reviews.length === 0 ? <p className="mt-3 text-muted">No reviews yet. A review can be posted after a qualifying purchase.</p> : null}
        <div className="mt-4 grid gap-4">
          {reviews.map((review) => (
            <article className="border-b border-line pb-4" key={review.id}>
              <p className="font-medium">{review.title}</p>
              <p className="text-sm text-muted">{review.rating} / 5 · {review.verified ? "Verified purchase" : "Unverified"} · {review.user.name} · {review.createdAt.toLocaleDateString("en-GH")}</p>
              <p className="mt-2">{review.body}</p>
              <p className="mt-2 text-sm text-muted">{review.helpfulCount} people found this helpful</p>
            </article>
          ))}
        </div>
        {eligible ? (
          <form action={createReviewAction} className="mt-6 grid max-w-xl gap-3">
            <input name="orderItemId" type="hidden" value={eligible.id} />
            <label>Rating<input className="mt-1 h-11 w-full border border-line px-3" max={5} min={1} name="rating" required type="number" /></label>
            <label>Title<input className="mt-1 h-11 w-full border border-line px-3" name="title" required /></label>
            <label>Review<textarea className="mt-1 w-full border border-line p-3" name="body" required rows={4} /></label>
            <button className="h-11 bg-navy text-ivory" type="submit">Publish review</button>
          </form>
        ) : <p className="mt-4 text-sm text-muted">{user ? "You can review this product after a paid or delivered order that has not already been reviewed." : <Link href={`/login?callbackUrl=/products/${product.slug}`}>Sign in to review a purchase</Link>}</p>}
      </section>
      <section className="mt-12">
        <h2 className="font-display text-2xl">Questions</h2>
        {product.questions.length === 0 ? <p className="mt-3 text-muted">No published questions yet.</p> : product.questions.map((question) => (
          <article className="mt-4 border-b border-line pb-4" key={question.id}>
            <p>{question.body}</p>
            {question.answer ? <p className="mt-2 text-sm"><span className="font-medium">Answer. </span>{question.answer}</p> : null}
          </article>
        ))}
        {user ? (
          <form action={askQuestionAction} className="mt-4 grid max-w-xl gap-3">
            <input name="productId" type="hidden" value={product.id} />
            <label>Ask a question<textarea className="mt-1 w-full border border-line p-3" name="body" required rows={3} /></label>
            <button className="h-11 border border-navy" type="submit">Submit question</button>
          </form>
        ) : null}
      </section>
      <section className="mt-12 border-t border-line pt-6">
        <h2 className="font-display text-2xl">Seller</h2>
        <p className="mt-2">{product.seller.store.name}</p>
        <p className="mt-2 max-w-2xl text-muted">{product.seller.store.description}</p>
        <Link className="mt-3 inline-block underline-offset-4 hover:underline" href={`/stores/${product.seller.store.slug}`}>Visit store</Link>
      </section>
      {related.together.length > 0 ? <Rail products={related.together} title="Frequently bought together" /> : null}
      <Rail products={related.related} title="Related products" />
      <Rail products={related.sameSeller} title="More from this seller" />
    </article>
  );
}

function Rail({ title, products }: { title: string; products: ProductCard[] }) {
  if (products.length === 0) return null;
  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl">{title}</h2>
      <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => <ProductCardView key={product.id} product={product} />)}
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { CategoryIcon } from "@/components/catalog/category-icon";

type CategoryLink = { name: string; slug: string; icon: string | null; children: { name: string; slug: string }[] };

export function SiteHeader({
  name,
  categories,
  cartCount,
  userName,
}: {
  name: string;
  categories: CategoryLink[];
  cartCount: number;
  userName: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ivory/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <button aria-expanded={open} aria-label="Open menu" className="lg:hidden" onClick={() => setOpen(true)} type="button"><Menu /></button>
        <Link className="flex items-center gap-2 font-display text-xl tracking-tight text-navy" href="/">
          <span className="grid size-8 place-items-center bg-navy text-xs font-bold text-ivory">LZ</span>
          {name}
        </Link>
        <div className="hidden flex-1 lg:block"><SearchBox /></div>
        <nav className="ml-auto flex items-center gap-3 text-sm">
          <button aria-label="Search" className="lg:hidden" onClick={() => setSearchOpen((value) => !value)} type="button"><Search /></button>
          <Link className="hidden sm:inline" href="/seller/register">Sell</Link>
          <Link aria-label={userName ? `Account for ${userName}` : "Account"} href={userName ? "/account" : "/login"}><UserRound /></Link>
          <Link aria-label={`Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`} className="relative" href="/cart">
            <ShoppingBag />
            {cartCount > 0 ? <span className="absolute -right-2 -top-2 grid min-w-5 place-items-center bg-signal px-1 text-xs text-white">{cartCount}</span> : null}
          </Link>
        </nav>
      </div>
      <nav aria-label="Categories" className="mx-auto hidden max-w-6xl gap-4 overflow-x-auto px-4 pb-3 text-sm lg:flex">
        {categories.map((category) => (
          <Link className="whitespace-nowrap text-navy hover:text-signal-ink" href={`/categories/${category.slug}`} key={category.slug}>{category.name}</Link>
        ))}
      </nav>
      {searchOpen ? <div className="border-t border-line px-4 py-3 lg:hidden"><SearchBox /></div> : null}
      {open ? (
        <div className="fixed inset-0 z-50 bg-navy/40 lg:hidden" onClick={() => setOpen(false)}>
          <div className="h-full w-[min(100%,22rem)] overflow-y-auto bg-ivory p-4" onClick={(event) => event.stopPropagation()} role="dialog" aria-label="Menu">
            <button aria-label="Close menu" onClick={() => setOpen(false)} type="button"><X /></button>
            <div className="mt-6 grid gap-2">
              {categories.map((category) => (
                <Link className="flex items-center gap-3 py-2" href={`/categories/${category.slug}`} key={category.slug} onClick={() => setOpen(false)}>
                  <CategoryIcon className="size-4" name={category.icon} />
                  {category.name}
                </Link>
              ))}
            </div>
            <div className="mt-6 grid gap-2 border-t border-line pt-4 text-sm">
              <Link href="/account">Account</Link>
              <Link href="/wishlist">Wishlist</Link>
              <Link href="/seller/register">Sell on {name}</Link>
              <Link href="/contact">Contact</Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function SearchBox() {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [suggestions, setSuggestions] = useState<{ products: { name: string; slug: string }[]; categories: { name: string; slug: string }[]; brands: { name: string; slug: string }[]; sellers: { name: string; slug: string }[] } | null>(null);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    if (term.trim().length < 2) return;
    const handle = window.setTimeout(async () => {
      const response = await fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`);
      if (response.ok) setSuggestions(await response.json());
    }, 300);
    return () => window.clearTimeout(handle);
  }, [term]);

  function rememberRecent() {
    const stored = window.localStorage.getItem("lzre.recent");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as unknown;
      if (Array.isArray(parsed)) setRecent(parsed.filter((item): item is string => typeof item === "string").slice(0, 6));
    } catch {
      setRecent([]);
    }
  }

  function go(value: string) {
    const next = [value, ...recent.filter((item) => item !== value)].slice(0, 6);
    window.localStorage.setItem("lzre.recent", JSON.stringify(next));
    router.push(`/search?q=${encodeURIComponent(value)}`);
  }

  return (
    <form action="/search" className="relative" role="search">
      <label className="sr-only" htmlFor="q">Search products</label>
      <input
        autoComplete="off"
        className="h-11 w-full border border-line bg-paper px-3 text-sm"
        id="q"
        name="q"
        onChange={(event) => {
          const value = event.target.value;
          setTerm(value);
          if (value.trim().length < 2) setSuggestions(null);
        }}
        onFocus={rememberRecent}
        placeholder="Search products, brands, or sellers"
        value={term}
      />
      {term.trim().length >= 2 && suggestions ? (
        <div className="absolute z-20 mt-1 w-full border border-line bg-paper p-3 text-sm">
          {suggestions.products.map((product) => <Link className="block py-1" href={`/products/${product.slug}`} key={product.slug}>{product.name}</Link>)}
          {suggestions.categories.map((category) => <Link className="block py-1 text-muted" href={`/categories/${category.slug}`} key={category.slug}>Category: {category.name}</Link>)}
          {suggestions.brands.map((brand) => <Link className="block py-1 text-muted" href={`/brands/${brand.slug}`} key={brand.slug}>Brand: {brand.name}</Link>)}
          {suggestions.sellers.map((seller) => <Link className="block py-1 text-muted" href={`/stores/${seller.slug}`} key={seller.slug}>Seller: {seller.name}</Link>)}
          {suggestions.products.length + suggestions.categories.length + suggestions.brands.length + suggestions.sellers.length === 0 ? <p>No matches yet.</p> : null}
        </div>
      ) : null}
      {term.length === 0 && recent.length > 0 ? (
        <div className="mt-2 hidden gap-2 text-xs text-muted lg:flex">
          {recent.map((item) => <button key={item} onClick={() => go(item)} type="button">{item}</button>)}
        </div>
      ) : null}
    </form>
  );
}

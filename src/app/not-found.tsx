import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="font-display text-4xl text-navy">Page not found</h1>
      <p className="mt-3 text-muted">That address is not part of LZRE.</p>
      <Link className="mt-6 inline-block underline" href="/">Back to the shop</Link>
    </div>
  );
}

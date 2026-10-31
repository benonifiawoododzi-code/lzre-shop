"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="font-display text-4xl text-navy">Something went wrong</h1>
      <p className="mt-3 text-muted">The page could not be loaded. No payment or account change was confirmed by this screen.</p>
      <button className="mt-6 h-11 bg-navy px-4 text-ivory" onClick={reset} type="button">Try again</button>
    </div>
  );
}

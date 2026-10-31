import Link from "next/link";

export function Pagination({ page, pages, hrefFor }: { page: number; pages: number; hrefFor: (page: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center gap-3 text-sm">
      {page > 1 ? <Link className="underline-offset-4 hover:underline" href={hrefFor(page - 1)}>Previous</Link> : <span className="text-muted">Previous</span>}
      <span>Page {page} of {pages}</span>
      {page < pages ? <Link className="underline-offset-4 hover:underline" href={hrefFor(page + 1)}>Next</Link> : <span className="text-muted">Next</span>}
    </nav>
  );
}

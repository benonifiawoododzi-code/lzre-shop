import { Button } from "@/components/ui/button";

export function EmptyState({ title, body, href, action }: { title: string; body: string; href?: string; action?: string }) {
  return (
    <div className="border-y border-line py-12">
      <h2 className="font-display text-2xl text-navy">{title}</h2>
      <p className="mt-2 max-w-xl text-muted">{body}</p>
      {href && action ? <div className="mt-6"><Button href={href}>{action}</Button></div> : null}
    </div>
  );
}

import Link from "next/link";
import { cn } from "@/lib/utils";

const styles = {
  primary: "bg-signal text-white hover:bg-signal-ink",
  secondary: "border border-navy bg-transparent text-navy hover:bg-navy hover:text-ivory",
  quiet: "bg-transparent px-0 text-navy underline-offset-4 hover:underline",
  danger: "border border-danger text-danger hover:bg-danger hover:text-white",
  inverse: "bg-ivory text-navy hover:bg-white",
};

export function Button({
  href,
  variant = "primary",
  className,
  children,
  type = "button",
  disabled,
}: {
  href?: string;
  variant?: keyof typeof styles;
  className?: string;
  children: React.ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const classNames = cn("inline-flex min-h-11 items-center justify-center px-4 text-sm font-semibold", styles[variant], className);
  if (href) return <Link className={classNames} href={href}>{children}</Link>;
  return <button className={classNames} disabled={disabled} type={type}>{children}</button>;
}

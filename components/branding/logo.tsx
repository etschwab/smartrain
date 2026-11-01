import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  href?: string;
  compact?: boolean;
};

export function Logo({ className, href = "/", compact = false }: LogoProps) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2", className)} aria-label="Smartrain Startseite">
      <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">S</span>
      {!compact ? <span className="font-semibold tracking-tight">Smartrain</span> : null}
    </Link>
  );
}

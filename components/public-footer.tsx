import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="border-t border-border">
      <div className="content-wrap flex flex-col items-center justify-between gap-3 py-6 text-sm text-muted-foreground sm:flex-row">
        <p>© {new Date().getFullYear()} Smartrain · Bern, Schweiz</p>
        <nav className="flex gap-5" aria-label="Rechtliche Links">
          <Link href="/impressum" className="hover:text-foreground">Impressum</Link>
          <Link href="/datenschutz" className="hover:text-foreground">Datenschutz</Link>
        </nav>
      </div>
    </footer>
  );
}

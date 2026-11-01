import Link from "next/link";
import { Logo } from "@/components/branding/logo";
import { Button } from "@/components/ui/button";

export function PublicNavbar({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  return (
    <>
      <a className="skip-link" href="#main-content">Zum Inhalt springen</a>
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="content-wrap flex h-14 items-center justify-between gap-4">
          <Logo />
          <nav aria-label="Hauptnavigation" className="flex items-center gap-1">
            <Link href="/#funktionen" className="hidden rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground sm:inline-block">
              Funktionen
            </Link>
            {isAuthenticated ? (
              <Button asChild size="sm">
                <Link href="/dashboard">Zur App</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Anmelden</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/signup">Kostenlos starten</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}

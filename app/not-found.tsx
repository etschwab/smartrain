import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="content-wrap flex min-h-screen items-center justify-center py-20">
      <div className="max-w-md text-center">
        <p className="section-kicker">404</p>
        <h1 className="mt-2 text-2xl font-semibold">Seite nicht gefunden</h1>
        <p className="mt-2 text-muted-foreground">Der Link ist vielleicht veraltet oder die Einladung nicht mehr aktiv.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild>
            <Link href="/dashboard">Zur Übersicht</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/">Startseite</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

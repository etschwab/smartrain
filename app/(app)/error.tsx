"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-12 text-center">
      <h2 className="text-xl font-semibold">Etwas ist schiefgelaufen</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Bitte versuche es erneut. Wenn das Problem bleibt, lade die Seite neu oder melde dich neu an.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Button onClick={() => reset()}>Erneut versuchen</Button>
        <Button asChild variant="secondary">
          <Link href="/dashboard">Zur Übersicht</Link>
        </Button>
      </div>
    </div>
  );
}

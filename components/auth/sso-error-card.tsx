import Link from "next/link";
import { ArrowLeft, RotateCcw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const messages: Record<string, string> = {
  sso_access_denied: "Die Anmeldung wurde abgebrochen. Es wurden keine Kontodaten an Smartrain übertragen.",
  sso_callback_failed: "Die zentrale Anmeldung konnte nicht abgeschlossen werden.",
  sso_not_configured: "Die zentrale Anmeldung ist für diese Umgebung noch nicht vollständig eingerichtet.",
  sso_state_invalid: "Die Sicherheitsprüfung der Anmeldung ist fehlgeschlagen. Bitte starte den Vorgang erneut.",
  sso_token_exchange_failed: "Die Anmeldebestätigung ist abgelaufen oder konnte nicht eingelöst werden.",
  sso_unavailable: "Der Anmeldedienst ist gerade nicht erreichbar. Bitte versuche es in ein paar Minuten erneut."
};

export function SsoErrorCard({ error, nextPath }: { error: string; nextPath: string }) {
  const retryUrl = `/auth/sso/start?next=${encodeURIComponent(nextPath)}`;

  return (
    <Card className="mx-auto w-full max-w-lg p-8 text-center sm:p-10">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-destructive/10 text-destructive"><ShieldAlert className="h-6 w-6" /></span>
      <h1 className="mt-5 text-2xl font-semibold">Anmeldung nicht abgeschlossen</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {messages[error] ?? "Bei der zentralen Anmeldung ist ein unerwarteter Fehler aufgetreten."}
      </p>
      <div className="mt-7 grid gap-3">
        <Button asChild className="w-full"><Link href={retryUrl}><RotateCcw className="h-4 w-4" />Erneut versuchen</Link></Button>
        <Button asChild variant="ghost" className="w-full"><Link href="/"><ArrowLeft className="h-4 w-4" />Zur Startseite</Link></Button>
      </div>
    </Card>
  );
}

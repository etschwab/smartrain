import Link from "next/link";
import { CalendarCheck, CalendarDays, Check, Link2, Repeat, Smartphone, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const features = [
  { title: "Termine planen", description: "Trainings, Spiele und Besprechungen mit Zeit, Ort und Infos – einzeln oder als wöchentliche Serie.", icon: CalendarDays },
  { title: "Zu- und Absagen", description: "Alle antworten mit einem Tipp. Du siehst sofort, wer dabei ist und wer noch fehlt.", icon: CalendarCheck },
  { title: "Einladen per Link", description: "Link oder QR-Code teilen – Spieler, Eltern und Coaches landen direkt im richtigen Team.", icon: Link2 },
  { title: "Rollen", description: "Owner und Coaches planen, Spieler und Eltern antworten. Jede Rolle sieht, was sie braucht.", icon: Users },
  { title: "Vorlagen", description: "Das Dienstagstraining einmal speichern und den nächsten Termin mit einem Klick anlegen.", icon: Repeat },
  { title: "Fürs Handy gemacht", description: "Funktioniert im Browser auf jedem Gerät – ohne App-Download.", icon: Smartphone }
];

const steps = [
  ["Team erstellen", "Name, Sportart und Saison eingeben – fertig."],
  ["Mitglieder einladen", "Den Einladungslink in den bestehenden Team-Chat schicken."],
  ["Termine planen", "Training anlegen und zusehen, wie die Zusagen eintreffen."]
];

const faqs = [
  ["Was kostet Smartrain?", "Nichts. Du kannst direkt ein Konto erstellen und dein Team anlegen."],
  ["Brauchen alle ein Konto?", "Ja, damit jede Person selbst zu- oder absagen kann. Die Registrierung dauert weniger als eine Minute."],
  ["Gibt es eine App?", "Smartrain läuft im Browser. Auf dem Handy kannst du die Seite zum Startbildschirm hinzufügen."]
];

export default function HomePage() {
  return (
    <main id="main-content">
      <section className="content-wrap py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="section-kicker">Team-App für Sportteams</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Wer kommt zum Training?
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Smartrain sammelt Termine und Zusagen deines Teams an einem Ort – statt verstreut in Chats und Listen.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/signup">Kostenlos starten</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/login">Anmelden</Link>
            </Button>
          </div>
        </div>

        <Card className="mx-auto mt-14 max-w-md p-5 text-left" aria-hidden="true">
          <p className="text-sm text-muted-foreground">Training · Morgen, 18:30</p>
          <p className="mt-1 font-semibold">Sportplatz Nord</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-lg bg-success/10 py-2 text-success"><span className="block text-lg font-semibold">14</span>Zugesagt</div>
            <div className="rounded-lg bg-warning/10 py-2 text-warning"><span className="block text-lg font-semibold">2</span>Vielleicht</div>
            <div className="rounded-lg bg-muted py-2 text-muted-foreground"><span className="block text-lg font-semibold">4</span>Offen</div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-success px-3 py-2 text-sm text-success">
            <Check className="h-4 w-4" />Du hast zugesagt
          </div>
        </Card>
      </section>

      <section id="funktionen" className="border-t border-border bg-card py-16 sm:py-20">
        <div className="content-wrap">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Das Wichtigste – nicht mehr</h2>
          <p className="mt-2 max-w-xl text-muted-foreground">Smartrain konzentriert sich auf das, was jede Woche anfällt.</p>
          <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title}>
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h3 className="mt-3 font-semibold">{feature.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-border py-16 sm:py-20">
        <div className="content-wrap grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">In drei Schritten startklar</h2>
            <ol className="mt-6 space-y-5">
              {steps.map(([title, description], index) => (
                <li key={title} className="flex gap-4">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold">{index + 1}</span>
                  <span>
                    <span className="block font-medium">{title}</span>
                    <span className="block text-sm text-muted-foreground">{description}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Häufige Fragen</h2>
            <dl className="mt-6 space-y-5">
              {faqs.map(([question, answer]) => (
                <div key={question}>
                  <dt className="font-medium">{question}</dt>
                  <dd className="mt-1 text-sm text-muted-foreground">{answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-card py-14">
        <div className="content-wrap flex flex-col items-center gap-4 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Bereit für das nächste Training?</h2>
          <Button asChild size="lg">
            <Link href="/signup">Team kostenlos erstellen</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

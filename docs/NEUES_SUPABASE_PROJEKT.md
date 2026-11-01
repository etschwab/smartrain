# Smartrain mit einem neuen Supabase-Projekt starten

Diese Anleitung gilt, wenn das bisherige Supabase-Projekt gelöscht wurde. Alte Konten, Teams und Termine sind damit verloren; alle müssen sich neu registrieren.

Empfohlen ist, zuerst mit dem **eingebauten Login** (E-Mail + Passwort oder Magic Link) zu starten. Der zentrale Login über `auth.etienneschwab.ch` hängt am selben Supabase-Projekt und kann später nach [`SUPABASE_SSO.md`](SUPABASE_SSO.md) wieder eingerichtet werden.

## 1. Supabase-Projekt anlegen

1. Auf [supabase.com](https://supabase.com/dashboard) ein neues Projekt erstellen (Region z. B. `Central EU (Frankfurt)`).
2. Warten, bis das Projekt bereit ist.

## 2. Datenbank einrichten

1. `SQL Editor` > `New query` öffnen.
2. Den kompletten Inhalt von [`supabase/setup.sql`](../supabase/setup.sql) einfügen und `Run` klicken.
3. Das Skript ist für eine **leere** Datenbank gedacht und wird nur einmal ausgeführt.

## 3. Login einstellen

Unter `Authentication`:

- `Sign In / Providers` > `Email`: aktiviert, inklusive Passwort-Login.
- `URL Configuration`:
  - Site URL: `https://smartrain.etienneschwab.ch`
  - Redirect URLs: `https://smartrain.etienneschwab.ch/auth/callback`
  - Für lokale Tests zusätzlich: `http://localhost:3000/auth/callback`

## 4. Vercel-Umgebungsvariablen anpassen

Im Vercel-Projekt **smartrain** unter `Settings` > `Environment Variables`:

| Variable | Wert |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `Project Settings` > `API` > Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `Project Settings` > `API Keys` > anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | `Project Settings` > `API Keys` > service_role / secret key |
| `NEXT_PUBLIC_SITE_URL` | `https://smartrain.etienneschwab.ch` |

Für den eingebauten Login diese drei Variablen **löschen** (sonst leitet Smartrain weiter an das alte zentrale Login):

- `NEXT_PUBLIC_AUTH_URL`
- `SUPABASE_OAUTH_CLIENT_ID`
- `SUPABASE_OAUTH_CLIENT_SECRET`

Danach unter `Deployments` den letzten Production-Deploy mit `Redeploy` neu bauen. `NEXT_PUBLIC_*`-Werte werden beim Build eingebettet und greifen erst nach einem neuen Deploy.

## 5. Prüfen

1. `https://smartrain.etienneschwab.ch/signup` öffnen und ein Konto erstellen.
2. Ein Team anlegen, einen Termin erstellen und zusagen.
3. Den Einladungslink in einem privaten Fenster mit einem zweiten Konto öffnen und beitreten.

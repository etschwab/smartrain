// Builds supabase/setup.sql: schema.sql followed by every migration in order,
// so a fresh Supabase project can be set up with a single paste into the SQL editor.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const supabaseDir = join(dirname(fileURLToPath(import.meta.url)), "..", "supabase");
const migrationsDir = join(supabaseDir, "migrations");

const parts = [
  ["schema.sql", readFileSync(join(supabaseDir, "schema.sql"), "utf8")],
  ...readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => [`migrations/${file}`, readFileSync(join(migrationsDir, file), "utf8")])
];

const header = `-- Smartrain: komplettes Datenbank-Setup für ein neues, leeres Supabase-Projekt.
--
-- Erzeugt mit \`npm run db:setup-sql\` aus supabase/schema.sql und allen Dateien
-- in supabase/migrations. Nicht von Hand bearbeiten.
--
-- Ausführen: Supabase Dashboard > SQL Editor > New query > Inhalt einfügen > Run.
`;

const body = parts
  .map(([name, sql]) => `\n-- ============================================================\n-- ${name}\n-- ============================================================\n\n${sql.replace(/\r\n/g, "\n").trim()}\n`)
  .join("");

writeFileSync(join(supabaseDir, "setup.sql"), header + body);
console.log(`supabase/setup.sql geschrieben (${parts.length} Dateien).`);

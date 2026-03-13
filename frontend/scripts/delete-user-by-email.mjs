/**
 * Supprime un utilisateur Auth Supabase par email.
 * Usage: node scripts/delete-user-by-email.mjs <email>
 *    ou: node --env-file=.env.local scripts/delete-user-by-email.mjs <email>
 *
 * Prérequis: .env ou .env.local avec
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... (Dashboard → Settings → API → service_role)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptRoot = join(__dirname, "..");
const cwd = process.cwd();
const roots = [cwd, scriptRoot];
for (const root of roots) {
  for (const name of [".env.local", ".env"]) {
    const envPath = join(root, name);
    if (existsSync(envPath)) {
      const content = readFileSync(envPath, "utf8").replace(/\r\n/g, "\n");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
        if (m) {
          let val = m[2].trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
            val = val.slice(1, -1);
          process.env[m[1]] = val;
        }
      }
    }
  }
}

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/delete-user-by-email.mjs <email>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceRoleKey) {
  const missing = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  console.error("Variable(s) manquante(s):", missing.join(", "));
  console.error("Vérifiez que .env (ou .env.local) est à la racine du projet et contient ces clés.");
  console.error("Racines utilisées:", roots.map((r) => join(r, ".env")).join(", "));
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

async function main() {
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) {
    console.error("Erreur listUsers:", listErr.message);
    process.exit(1);
  }
  const user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    console.log("Aucun utilisateur trouvé avec l'email:", email);
    process.exit(0);
  }
  const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
  if (delErr) {
    console.error("Erreur deleteUser:", delErr.message);
    process.exit(1);
  }
  console.log("Utilisateur supprimé:", email, "(id:", user.id, ")");
}

main();

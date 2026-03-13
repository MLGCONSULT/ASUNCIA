import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const port = Number(process.env.SMOKE_PORT || 4310);
const baseUrl = `http://127.0.0.1:${port}`;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function waitForServer(url, retries = 30) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status >= 400) {
        return;
      }
    } catch {
      // Le serveur n'est pas encore prêt.
    }
    await sleep(500);
  }
  throw new Error("Le serveur backend n'a pas démarré à temps pour le smoke test.");
}

async function fetchJson(path, expectedStatuses) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Accept: "application/json" },
  });
  assert(
    expectedStatuses.includes(response.status),
    `Statut inattendu pour ${path}: ${response.status}`
  );
  const data = await response.json();
  assert(typeof data === "object" && data !== null, `Réponse JSON invalide pour ${path}`);
  return data;
}

const child = spawn(process.execPath, ["dist/src/server.js"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(port),
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let stderr = "";
child.stderr.on("data", (chunk) => {
  stderr += chunk.toString();
});

try {
  await waitForServer(`${baseUrl}/api/health/mcp-gmail`);

  await fetchJson("/api/health/mcp-supabase", [200, 502, 503]);
  await fetchJson("/api/health/mcp-gmail", [200, 503]);
  await fetchJson("/api/health/mcp-airtable", [200, 502, 503]);
  await fetchJson("/api/health/mcp-notion", [200, 502, 503]);
  await fetchJson("/api/health/mcp-n8n", [200, 502, 503]);

  await fetchJson("/api/chat", [401, 404]);
  await fetchJson("/api/gmail/status", [401]);
  await fetchJson("/api/notion/status", [401]);
  await fetchJson("/api/airtable/status", [401]);

  console.log("Smoke backend OK");
} finally {
  child.kill();
  await sleep(500);
  if (child.exitCode && child.exitCode !== 0 && stderr.trim()) {
    console.error(stderr);
  }
}

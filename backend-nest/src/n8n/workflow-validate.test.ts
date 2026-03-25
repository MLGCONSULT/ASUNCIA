import { describe, it, expect } from "vitest";
import { collectWorkflowValidationErrors } from "./workflow-validate";

describe("collectWorkflowValidationErrors", () => {
  it("rejette connections vide avec 2+ noeuds", () => {
    const err = collectWorkflowValidationErrors(
      {
        nodes: [
          { name: "A", type: "n8n-nodes-base.manualTrigger" },
          { name: "B", type: "n8n-nodes-base.set" },
        ],
        connections: {},
      },
      [],
    );
    expect(err.some((e) => e.includes("connections est vide"))).toBe(true);
  });

  it("accepte une chaîne valide", () => {
    const err = collectWorkflowValidationErrors(
      {
        nodes: [
          { name: "Déclenchement manuel", type: "n8n-nodes-base.manualTrigger" },
          { name: "Suite", type: "n8n-nodes-base.set" },
        ],
        connections: {
          "Déclenchement manuel": {
            main: [[{ node: "Suite", type: "main", index: 0 }]],
          },
        },
      },
      [],
    );
    expect(err.filter((e) => e.includes("connections") || e.includes("Connexion")).length).toBe(0);
  });

  it("signale Gmail incomplet", () => {
    const err = collectWorkflowValidationErrors(
      {
        nodes: [{ name: "G", type: "n8n-nodes-base.gmail", parameters: {} }],
        connections: {},
      },
      [],
    );
    expect(err.length).toBeGreaterThan(0);
  });

  it("golden fixture : chaîne manuel → set sans erreur structurelle", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const dir = dirname(fileURLToPath(import.meta.url));
    const raw = readFileSync(join(dir, "fixtures", "minimal-valid-workflow.json"), "utf-8");
    const wf = JSON.parse(raw) as {
      nodes: { name: string; type: string; parameters?: Record<string, unknown> }[];
      connections: Record<string, unknown>;
    };
    const err = collectWorkflowValidationErrors(wf, []);
    expect(err.filter((e) => e.includes("connections") || e.includes("Connexion")).length).toBe(0);
  });
});

/**
 * Validations structurelles pour les workflows n8n générés (import JSON).
 * Fonctions pures : testables sans Nest/OpenAI.
 */

export type N8nWorkflowNodeLike = {
  name: string;
  type: string;
  typeVersion?: number;
  parameters?: Record<string, unknown>;
};

export type N8nWorkflowJsonLike = {
  name?: string;
  nodes: N8nWorkflowNodeLike[];
  connections: Record<string, unknown>;
  settings?: Record<string, unknown>;
};

function countConnectionTargets(connections: Record<string, unknown>): number {
  let n = 0;
  for (const sourceConn of Object.values(connections)) {
    if (!sourceConn || typeof sourceConn !== "object" || Array.isArray(sourceConn)) continue;
    const src = sourceConn as Record<string, unknown>;
    const mains = Array.isArray(src.main) ? src.main : [];
    for (const branch of mains) {
      if (!Array.isArray(branch)) continue;
      for (const edge of branch) {
        if (edge && typeof edge === "object" && typeof (edge as { node?: unknown }).node === "string") {
          n += 1;
        }
      }
    }
  }
  return n;
}

function collectTargets(connections: Record<string, unknown>): Set<string> {
  const targets = new Set<string>();
  for (const sourceConn of Object.values(connections)) {
    if (!sourceConn || typeof sourceConn !== "object" || Array.isArray(sourceConn)) continue;
    const src = sourceConn as Record<string, unknown>;
    const mains = Array.isArray(src.main) ? src.main : [];
    for (const branch of mains) {
      if (!Array.isArray(branch)) continue;
      for (const edge of branch) {
        if (edge && typeof edge === "object" && typeof (edge as { node?: string }).node === "string") {
          targets.add((edge as { node: string }).node);
        }
      }
    }
  }
  return targets;
}

/**
 * Règles : un seul objet JSON (géré à l’extraction), connections non vides si ≥2 nœuds,
 * au moins une arête, noms de nœuds uniques, paramètres Gmail « liste » cohérents.
 */
export function collectWorkflowValidationErrors(
  workflow: N8nWorkflowJsonLike,
  _knownNodeTypes: string[],
): string[] {
  const errors: string[] = [];
  const nodes = Array.isArray(workflow.nodes) ? workflow.nodes : [];
  const nodeNames = nodes.map((n) => n.name);
  const nameSet = new Set<string>();
  for (const name of nodeNames) {
    if (nameSet.has(name)) {
      errors.push(`Nom de noeud dupliqué: "${name}".`);
    }
    nameSet.add(name);
  }

  const connections =
    workflow.connections && typeof workflow.connections === "object" && !Array.isArray(workflow.connections)
      ? workflow.connections
      : {};

  if (nodes.length >= 2) {
    const keys = Object.keys(connections);
    if (keys.length === 0) {
      errors.push(
        "connections est vide alors qu'il y a plusieurs noeuds: relie les noeuds avec connections.main et des clés = noms des noeuds sources.",
      );
    } else {
      const edgeCount = countConnectionTargets(connections);
      if (edgeCount === 0) {
        errors.push(
          "Aucune connexion main valide: chaque lien doit être { node: \"Nom destination\", type: \"main\", index: 0 } dans connections[NomSource].main[0].",
        );
      }
      for (const sourceName of keys) {
        if (!nameSet.has(sourceName)) {
          errors.push(`Connexion: source "${sourceName}" absente des noeuds.`);
        }
      }
      const targets = collectTargets(connections);
      for (const t of targets) {
        if (!nameSet.has(t)) {
          errors.push(`Connexion: cible "${t}" absente des noeuds.`);
        }
      }
    }
  }

  for (const node of nodes) {
    const t = typeof node.type === "string" ? node.type : "";
    if (t === "n8n-nodes-base.gmail") {
      const p = node.parameters ?? {};
      const resource = p.resource;
      const operation = p.operation;
      if (resource !== "message") {
        errors.push(
          `Gmail "${node.name}": parameters.resource doit être "message" pour lister des emails (reçu: ${String(resource)}).`,
        );
      }
      if (operation !== "getAll" && operation !== "getMany") {
        errors.push(
          `Gmail "${node.name}": parameters.operation doit être "getAll" ou "getMany" pour une liste (reçu: ${String(operation)}).`,
        );
      }
      const limit = p.limit;
      if (limit !== undefined && typeof limit !== "number") {
        errors.push(`Gmail "${node.name}": parameters.limit doit être un nombre si présent.`);
      }
    }
  }

  return errors;
}

# 04 — MCP et intégrations

## MCP dans ce projet

**MCP** (Model Context Protocol) sert de **langage commun** entre l’API NestJS et des **serveurs MCP** hébergés à l’extérieur du dépôt. Le backend ne réinvente pas chaque connecteur : il utilise des **clients MCP** pour parler à **Supabase**, **n8n** et **Airtable**.

## Ce qui est branché

| Outil | Mode retenu dans la doc |
|-------|-------------------------|
| **Supabase** | MCP (token d’accès MCP, `SUPABASE_ACCESS_TOKEN`, etc.) |
| **n8n** | MCP avec jeton serveur (`N8N_MCP_URL`, `N8N_MCP_ACCESS_TOKEN`) |
| **Airtable** | MCP en **server-token** : `AIRTABLE_RUNTIME_MODE=server-token`, URL du serveur MCP Airtable, jeton côté serveur (`AIRTABLE_MCP_TOKEN` ou équivalent). |

Chaque intégration a sa **liste de variables** dans [`14-guide-configuration-mcp.md`](14-guide-configuration-mcp.md).

## Intérêt pour un projet IA

Le MCP clarifie **où** se fait le pont avec l’extérieur. Pour le modèle, certaines actions restent **exposables** de façon stable ; côté équipe, on peut faire évoluer l’hébergement MCP sans tout mélanger dans le front.

## Routes de santé

Des URLs du type `/api/health/mcp-supabase`, `/api/health/mcp-n8n`, `/api/health/mcp-airtable` permettent de **vérifier** rapidement si la configuration est présente.

## n8n — MCP instance (outils exposés)

Le serveur MCP **intégré à l’instance n8n** expose typiquement trois outils. Le backend les appelle via `callN8nMcpTool` (`backend-nest/src/mcp/n8n-client.ts`) en respectant le **schéma JSON** renvoyé par `list_tools` sur votre instance.

| Outil | Rôle | Paramètres notables |
|-------|------|----------------------|
| **`search_workflows`** | Lister / filtrer les workflows exposés au MCP | `limit` entre **1 et 200** (optionnel), `query` (nom / description), `projectId` (optionnel). |
| **`get_workflow_details`** | Détail d’un workflow (nœuds, connexions, métadonnées, droits) | **`workflowId`** (string, requis) — pas `workflow_id`. |
| **`execute_workflow`** | Déclencher un workflow éligible (webhook, form, chat, etc.) | **`workflowId`** (requis), **`inputs`** (optionnel mais structuré) : union discriminée par **`type`** : `chat` → `chatInput` ; `form` → `formData` ; `webhook` → **`webhookData`** `{ method?, query?, body?, headers? }` — **pas** de `body` à la racine de `inputs`. |

### Comportement côté API NestJS

- **`normalizeExecuteWorkflowInputs`** (`n8n-client.ts`) : si le client n’envoie pas d’`inputs` ou un objet sans `type`, le serveur envoie par défaut un déclenchement **webhook** avec `webhookData` minimal (ex. `method: "POST"`, `body: {}`). Les appels **`mcp_n8n`** avec l’outil `execute_workflow` subissent la même normalisation ; pour `get_workflow_details`, un ancien argument `workflow_id` est encore mappé vers **`workflowId`**.
- **`parseMcpResultJson`** (`mcp/result.ts`) : en cas d’échec de parsing JSON, le message d’erreur renvoyé au client peut être **long** (plafond élevé), pour ne pas tronquer les détails de validation MCP.

### Réponse `get_workflow_details` : brouillon vs version publiée

L’objet `workflow` renvoyé par le MCP contient souvent :

- à la **racine** : `nodes` / `connections` correspondant au **brouillon** en édition ;
- dans **`activeVersion`** : le graphe **publié** (celui exécuté en production quand le workflow est actif).

L’**interface** Workflows de l’app affiche par défaut un JSON **effectif** reconstruit à partir de `activeVersion` (voir [`07-frontend.md`](07-frontend.md)).

## Fiabilité

Les **secrets** (jetons MCP, clés serveur) restent **côté backend** ; le front ne fait pas le travail sensible.

## À préserver si le code évolue

Compatibilité des connecteurs **n8n**, **Supabase** et **Airtable** via MCP ; contrôles de santé lisibles ; documentation **alignée** sur les variables réellement utilisées.

## Fichiers de référence

- `backend-nest/src/config/mcp.ts`
- `backend-nest/src/mcp/` (dont `n8n-client.ts`, `result.ts`)
- `backend-nest/src/n8n/n8n.controller.ts`
- `backend-nest/src/ai/tool-executor.ts` (outils `n8n_*` et `mcp_n8n`)
- `backend-nest/src/health/health-mcp.controller.ts`
- `frontend/src/app/app/n8n/N8nView.tsx`
- `doc_technique/13-checklist-validation-mcp.md`
- `doc_technique/14-guide-configuration-mcp.md`

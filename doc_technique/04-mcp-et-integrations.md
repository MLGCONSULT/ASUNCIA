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

## Fiabilité

Les **secrets** (jetons MCP, clés serveur) restent **côté backend** ; le front ne fait pas le travail sensible.

## À préserver si le code évolue

Compatibilité des connecteurs **n8n**, **Supabase** et **Airtable** via MCP ; contrôles de santé lisibles ; documentation **alignée** sur les variables réellement utilisées.

## Fichiers de référence

- `backend-nest/src/config/mcp.ts`
- `backend-nest/src/mcp/`
- `backend-nest/src/health/health-mcp.controller.ts`
- `doc_technique/13-checklist-validation-mcp.md`
- `doc_technique/14-guide-configuration-mcp.md`

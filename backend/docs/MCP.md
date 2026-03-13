# Vérification et configuration des serveurs MCP

Ce document décrit le mode de fonctionnement attendu des intégrations MCP de l'application. La source de vérité technique reste `backend/src/config/mcp.ts`.

## Matrice de configuration

| Provider | Variables requises | Mode de production recommandé | Health check | Route fonctionnelle |
| --- | --- | --- | --- | --- |
| `supabase` | `SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF` ou `NEXT_PUBLIC_SUPABASE_URL` | `server-token` | `GET /api/health/mcp-supabase` | `POST /api/mcp/call` |
| `n8n` | `N8N_MCP_URL`, `N8N_MCP_ACCESS_TOKEN` | `server-token` | `GET /api/health/mcp-n8n` | `GET /api/n8n/workflows` |
| `gmail` | `GMAIL_MCP_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `oauth` lecture + envoi | `GET /api/health/mcp-gmail` | `GET /api/gmail/messages`, `POST /api/gmail/send` |
| `airtable` | `AIRTABLE_MCP_URL`, `AIRTABLE_RUNTIME_MODE`, puis `AIRTABLE_OAUTH_CLIENT_ID` ou `AIRTABLE_MCP_TOKEN/AIRTABLE_TOKEN` | `oauth` si actions par utilisateur, sinon `server-token` | `GET /api/health/mcp-airtable` | `GET /api/airtable/bases` |
| `notion` | `NOTION_MCP_URL`, `NOTION_RUNTIME_MODE`, puis `NOTION_OAUTH_REDIRECT_URI` / `NOTION_OAUTH_CLIENT_ID` ou `NOTION_MCP_TOKEN` | `oauth` sur serveur officiel, sinon `server-token` | `GET /api/health/mcp-notion` | `GET /api/notion/search` |

## Règles importantes

- Ne pas confondre `NOTION_MCP_URL` et `N8N_MCP_URL`.
- Le backend agit comme client MCP HTTP. Il n'embarque pas de serveur MCP.
- `Gmail` est désormais aligné en mode `OAuth utilisateur lecture + envoi`.
- `n8n` reste un provider `token serveur`.
- `Airtable` et `Notion` supportent deux modes explicites :
  - `oauth` : connexion utilisateur, stockée dans `oauth_tokens`
  - `server-token` : token global en variable d'environnement
- En production, définir explicitement `AIRTABLE_RUNTIME_MODE` et `NOTION_RUNTIME_MODE` au lieu de s'appuyer sur l'auto-détection.

## Persistance OAuth

Deux tables Supabase complètent maintenant `oauth_tokens` :

- `oauth_pending` : stocke temporairement `state`, `code_verifier`, `redirect_uri` et le client OAuth utilisé, avec expiration
- `oauth_provider_clients` : stabilise les clients OAuth dynamiques, notamment pour `Notion`, afin d'eviter les problemes de cold start

Ces tables permettent un fonctionnement fiable en environnement serverless ou multi-instance.

## Lecture des health checks

Les routes de health renvoient maintenant une réponse plus précise :

- `503` : configuration insuffisante ou absente
- `502` : MCP configuré mais erreur réseau / compatibilité / outil
- `200` avec `tools` : le backend a pu lister les outils du serveur MCP
- `200` avec `requiresUserConnection: true` : la configuration serveur est correcte, mais un utilisateur doit se connecter avant vérification complète
- `selectedMode` : rappelle le mode choisi pour éviter les ambiguïtés de runtime

Exemples :

- `GET /api/health/mcp-gmail`
  - valide `GMAIL_MCP_URL`
  - valide aussi la présence des secrets Google OAuth
  - expose `capabilities: ["read_messages", "send_email"]`

- `GET /api/health/mcp-notion`
  - liste les outils si un `NOTION_MCP_TOKEN` serveur existe
  - sinon renvoie `requiresUserConnection: true` si le mode OAuth est prêt

- `GET /api/health/mcp-airtable`
  - liste les outils avec un token serveur
  - sinon renvoie `requiresUserConnection: true` si le mode OAuth est prêt

## Noms d'outils attendus

Le backend supporte les contrats suivants.

### Supabase

- `list_tools`
- tout autre outil MCP Supabase passé à `POST /api/mcp/call`

### n8n

- `search_workflows`
- `get_workflow_details`
- `execute_workflow`
- fallback géré pour `activate`, `deactivate`, `create`, `update`, `delete`

### Airtable

- `list_bases`
- `list_tables`
- `list_records`
- `create_record`
- `update_records`

### Notion

- officiel : `notion-search`, `query-data-source`
- alternatif : `search`, `query_database`

### Gmail

- `list_messages`
- `get_message`
- `send_email`

## Checklist de validation réelle

1. Vérifier tous les health checks publics.
2. Vérifier `POST /api/mcp/call` avec le MCP Supabase et `toolName: "list_tools"`.
3. Vérifier `GET /api/n8n/workflows` avec un vrai serveur n8n accessible.
4. Vérifier un cycle Gmail complet :
   - connexion OAuth
   - lecture de messages
   - envoi d'un mail de test
5. Vérifier un cycle Notion complet :
   - connexion OAuth ou token serveur selon le mode choisi
   - `search`
   - `query`
   - redéploiement ou cold start sans perdre le client OAuth
6. Vérifier un cycle Airtable complet :
   - connexion OAuth ou token serveur selon le mode choisi
   - lecture d'une base
   - écriture sur une table de test
7. Exécuter `npm run smoke -w backend` après le build.

## Parsing des réponses

Les routes reposent sur `backend/src/mcp/result.ts` pour transformer les réponses MCP en JSON exploitable. Si un serveur MCP renvoie un format inattendu, il faut adapter les normalisations dans les routes ou dans le service associé plutôt que dans le frontend.

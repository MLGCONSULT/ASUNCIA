# Configurer Notion (MCP)

Objectif: activer Notion sans erreur dans l'application.

Important: si tu utilises `https://mcp.notion.com/mcp`, c'est un mode OAuth utilisateur.
Le mode `server-token` doit passer par ton propre serveur MCP Notion (auto-heberge).

---

## Quelle option choisir

| Mode | Quand l'utiliser | URL MCP | Authentification |
|---|---|---|---|
| OAuth (officiel) | chaque utilisateur connecte son compte | `https://mcp.notion.com/mcp` | bouton "Connecter Notion" |
| Server-token | un token serveur global pour toute l'app | URL de ton serveur `notion-mcp-server` | `NOTION_MCP_TOKEN` |

---

## Mode server-token (celui que tu demandes)

### 1) Creer une integration Notion (pour lire tes pages/bases)

1. Ouvre [Notion Integrations](https://www.notion.so/profile/integrations).
2. Clique sur "New integration" (integration interne).
3. Copie le secret de l'integration (token Notion, type `ntn_...` ou `secret_...` selon version).
4. Dans Notion, ouvre chaque page/base a exposer:
   - `...` -> `Connections` -> selectionne ton integration.

Ce token sert au serveur MCP Notion pour parler a Notion.

### 2) Lancer ton serveur MCP Notion

Exemple local:

```bash
npx @notionhq/notion-mcp-server --transport http --port 3333 --auth-token "mcp_shared_token_123"
```

Variables cote serveur MCP (exemple):

```env
NOTION_TOKEN=ntn_xxxxx
```

### 3) Configurer le backend de l'app

Dans le `.env` backend utilise par ton deploy (`backend-nest/.env.prod` en prod, `.env` en local):

```env
NOTION_RUNTIME_MODE=server-token
NOTION_MCP_URL=http://localhost:3333/mcp
NOTION_MCP_TOKEN=mcp_shared_token_123
```

Si ton serveur MCP ne demande pas de `--auth-token`, laisse `NOTION_MCP_TOKEN` vide.

### 4) Redemarrer et verifier

1. Redemarre le backend.
2. Verifie l'endpoint de sante Notion (`/api/health/mcp-notion`).
3. Ouvre l'onglet Notion dans l'app: en `server-token`, il ne doit plus demander la connexion OAuth.

---

## Erreurs classiques

- `invalid_token format` avec `mcp.notion.com/mcp`:
  - tu es en train de melanger server-token et MCP officiel.
  - solution: soit OAuth officiel, soit serveur MCP auto-heberge.

- `outil introuvable`:
  - `NOTION_MCP_URL` pointe vers un autre serveur (ex: n8n).

- Notion vide:
  - l'integration Notion n'est pas connectee aux pages/bases.

---

## OAuth officiel (rappel rapide)

Si tu veux rester sur `https://mcp.notion.com/mcp`:

```env
NOTION_RUNTIME_MODE=oauth
NOTION_MCP_URL=https://mcp.notion.com/mcp
NOTION_OAUTH_REDIRECT_URI=https://<backend>/api/auth/notion/callback
```

Puis connexion depuis l'interface utilisateur.

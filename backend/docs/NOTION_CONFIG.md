# Configurer Notion (MCP)

Tu as l’erreur **« Notion non disponible »** ou **« outil introuvable »** ? Suis une des deux options ci‑dessous.

---

## Vérifier d’abord le `.env`

**Ne pas mélanger les URLs MCP.**

Dans `backend/.env` tu dois avoir :

- **NOTION_MCP_URL** → uniquement le serveur **Notion** MCP (voir ci‑dessous).
- **N8N_MCP_URL** → uniquement ton serveur **n8n** (ex. `https://n8n.srv..../mcp-server/http`).

Si `NOTION_MCP_URL` pointe par erreur vers n8n, tu auras « outil introuvable » sur la page Notion.

---

## Option 1 – MCP officiel Notion (OAuth, recommandé)

Utilise le serveur Notion hébergé par Notion. Pas de token dans le `.env` pour Notion, tout passe par la connexion dans l’app.

### 1. Dans `backend/.env`

```env
# Obligatoire pour OAuth Notion
NOTION_OAUTH_REDIRECT_URI=http://localhost:4000/api/auth/notion/callback

# URL du MCP officiel Notion (par défaut si tu ne mets rien)
NOTION_MCP_URL=https://mcp.notion.com/mcp
```

- En production, remplace `http://localhost:4000` par l’URL de ton backend.
- **Ne mets pas** `NOTION_MCP_URL` sur l’URL n8n.

### 2. Connecter Notion dans l’app

1. Ouvre l’app (frontend).
2. Va sur la page **Notion** (icône Notion dans le footer).
3. Clique sur **« Connecter Notion »** (ou équivalent).
4. Tu es redirigé vers Notion pour autoriser l’accès.
5. Après validation, tu reviens sur l’app ; Notion doit apparaître comme connecté.

Sans cette étape, le backend n’a pas de token et renverra « Connectez Notion depuis les paramètres ».

### 3. Si tu as encore « outil introuvable »

- Vérifie que `NOTION_MCP_URL` est bien `https://mcp.notion.com/mcp` (et pas n8n).
- Redémarre le backend après toute modification du `.env`.

---

## Option 2 – Serveur open‑source (notion-mcp-server)

Si tu préfères héberger toi‑même le MCP Notion avec un token d’intégration :

### 1. Créer une intégration Notion

1. Va sur [Notion – Integrations](https://www.notion.so/profile/integrations).
2. Crée une **internal integration** (ou utilise une existante).
3. Récupère le **secret** (commence par `ntn_` ou `secret_`).
4. Dans Notion, **connecte** les pages/bases que tu veux à cette intégration (menu ⋮ → Connect to → ton intégration).

### 2. Lancer le serveur MCP en HTTP

Sur ta machine ou un serveur :

```bash
npx @notionhq/notion-mcp-server --transport http --port 3333
```

À l’affichage, note le **token** généré (ou utilise `--auth-token "ton-token"`).

Le MCP sera accessible à : `http://localhost:3333/mcp` (ou l’URL de ta machine si tu es en remote).

### 3. Dans `backend/.env`

```env
# Pointe vers TON serveur notion-mcp-server (pas vers mcp.notion.com ni n8n)
NOTION_MCP_URL=http://localhost:3333/mcp

# Token : soit celui affiché au lancement, soit le secret de ton intégration Notion
NOTION_MCP_TOKEN=ntn_xxxx...
```

Si le serveur MCP exige le token dans le header, utilise bien `NOTION_MCP_TOKEN`. Si tu lances avec `NOTION_TOKEN=ntn_...` côté serveur MCP, le backend peut aussi envoyer ce même token dans `NOTION_MCP_TOKEN` pour s’authentifier auprès du MCP.

### 4. Pas d’OAuth nécessaire

Avec cette option, tu n’as pas besoin de « Connecter Notion » dans l’app : le token du `.env` suffit. Les routes Notion du backend utiliseront ce token.

---

## Récap

| Option              | NOTION_MCP_URL           | Token / OAuth                          |
|--------------------|--------------------------|----------------------------------------|
| 1 – MCP officiel   | `https://mcp.notion.com/mcp` | Connexion OAuth dans l’app (pas de token .env) |
| 2 – Open‑source    | URL de ton serveur MCP   | `NOTION_MCP_TOKEN` dans `.env`         |

En cas d’erreur, vérifier : `NOTION_MCP_URL` ≠ URL n8n, et (option 1) que tu as bien fait « Connecter Notion » dans l’app.

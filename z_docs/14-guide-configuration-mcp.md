# 14 – Configurer les MCP pour que l’app fonctionne à 100 %

Ce guide indique **quoi mettre où** et **dans quel ordre** pour que chaque intégration MCP soit opérationnelle. Les variables listées sont la source de vérité minimale ; le détail technique est dans `backend/docs/MCP.md` et la checklist de validation dans `z_docs/13-checklist-validation-mcp.md`.

---

## 1. Où configurer ?

| Fichier | Rôle |
|--------|------|
| **Backend** : `backend/.env` | URL MCP, tokens serveur, clés OAuth utilisées par le backend (Notion, Airtable, Gmail, n8n, Supabase). |
| **Frontend** : `frontend/.env` | Supabase (affichage + auth), URL du backend, **Gmail uniquement** : `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` (callback OAuth sur le front). |

À chaque fois, copier `backend/.env.example` et `frontend/.env.example` puis remplir les valeurs.

---

## 2. Ordre recommandé

1. **Supabase (obligatoire)**  
   Sans ça, l’app (auth, BDD) ne tourne pas.

2. **Backend de base**  
   `PORT`, `FRONTEND_URL`, `NEXT_PUBLIC_SITE_URL`, `ALLOWED_ORIGINS`, `OPENAI_API_KEY` si tu utilises le chat.

3. **Un MCP à la fois**  
   Configurer un provider, vérifier son health check, puis passer au suivant.

---

## 3. Par provider : quoi mettre et comment vérifier

### Supabase (app + MCP optionnel)

**Backend `.env`**

- `NEXT_PUBLIC_SUPABASE_URL` = URL du projet (ex. `https://xxx.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = clé anon
- `SUPABASE_SERVICE_ROLE_KEY` = clé service role (auth, BDD)
- Pour l’assistant MCP : `SUPABASE_ACCESS_TOKEN` (token MCP Supabase). Optionnel : `SUPABASE_PROJECT_REF` si non déduit de l’URL.

**Frontend `.env`**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` = URL du site
- `NEXT_PUBLIC_BACKEND_URL` = URL du backend

**Vérif** : l’app se charge, la connexion fonctionne. MCP : `GET /api/health/mcp-supabase` → 200 avec infos outils.

---

### n8n

**Backend `.env` uniquement**

- `N8N_MCP_URL` = URL du serveur MCP n8n (ex. `https://ton-n8n.example.com/mcp-server/http`)
- `N8N_MCP_ACCESS_TOKEN` = token d’accès au MCP

**Vérif** : `GET /api/health/mcp-n8n` → 200. Puis `GET /api/n8n/workflows` (connecté) pour voir les workflows.

---

### Gmail

**Backend `.env`**

- `GMAIL_MCP_URL` = URL du serveur MCP Gmail
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

**Frontend `.env`**

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`  
  (mêmes valeurs : le front gère la redirection OAuth Gmail)

En production, le callback Gmail doit être exactement :  
`https://<ton-frontend>/api/auth/gmail/callback`.

**Vérif** : `GET /api/health/mcp-gmail` → 200 ou indique qu’une connexion utilisateur est requise. Ensuite : se connecter via l’app, ouvrir Mails, vérifier lecture + envoi.

---

### Notion

**Backend `.env`**

Choisir un mode et rester cohérent :

- **OAuth (utilisateur)**  
  - `NOTION_RUNTIME_MODE=oauth`  
  - `NOTION_MCP_URL` (ex. `https://mcp.notion.com/mcp`)  
  - `NOTION_OAUTH_REDIRECT_URI` = `https://<backend>/api/auth/notion/callback`  
  - Optionnel mais recommandé : `NOTION_OAUTH_CLIENT_ID`, `NOTION_OAUTH_CLIENT_SECRET`

- **Token serveur (global)**  
  - `NOTION_RUNTIME_MODE=server-token`  
  - `NOTION_MCP_URL`  
  - `NOTION_MCP_TOKEN` ou `NOTION_API_KEY`

**Vérif** : `GET /api/health/mcp-notion` → 200 ou `requiresUserConnection: true` en mode OAuth. Puis connexion depuis l’app (Notion) et une recherche / lecture.

---

### Airtable

**Backend `.env`**

Même idée : un seul mode.

- **OAuth (utilisateur)**  
  - `AIRTABLE_RUNTIME_MODE=oauth`  
  - `AIRTABLE_MCP_URL` (ex. `https://mcp.airtable.com/mcp`)  
  - `AIRTABLE_OAUTH_CLIENT_ID`, `AIRTABLE_OAUTH_CLIENT_SECRET`  
  - `AIRTABLE_OAUTH_REDIRECT_URI` = `https://<backend>/api/auth/airtable/callback`

- **Token serveur**  
  - `AIRTABLE_RUNTIME_MODE=server-token`  
  - `AIRTABLE_MCP_URL`  
  - `AIRTABLE_MCP_TOKEN` ou `AIRTABLE_TOKEN`

**Vérif** : `GET /api/health/mcp-airtable` → 200 ou `requiresUserConnection: true`. Puis connexion depuis l’app (Airtable) et accès aux bases.

---

## 4. Résumé : variables par fichier

**Backend `.env` (à compléter selon les MCP utilisés)**

- App : `PORT`, `FRONTEND_URL`, `NEXT_PUBLIC_SITE_URL`, `ALLOWED_ORIGINS`
- Supabase : `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, optionnel `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`
- OpenAI : `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL`
- n8n : `N8N_MCP_URL`, `N8N_MCP_ACCESS_TOKEN`
- Gmail : `GMAIL_MCP_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Notion : `NOTION_MCP_URL`, `NOTION_RUNTIME_MODE`, puis soit OAuth (redirect + client id/secret) soit `NOTION_MCP_TOKEN` / `NOTION_API_KEY`
- Airtable : `AIRTABLE_MCP_URL`, `AIRTABLE_RUNTIME_MODE`, puis soit OAuth (redirect + client id/secret) soit `AIRTABLE_MCP_TOKEN` / `AIRTABLE_TOKEN`

**Frontend `.env`**

- Toujours : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BACKEND_URL`
- Si Gmail OAuth : `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

---

## 5. Après configuration : valider pour de vrai

1. Tester chaque health check concerné (`/api/health/mcp-*`).
2. Dans l’app : connexion, puis utiliser chaque outil (Mails, Notion, Airtable, n8n) au moins une fois.
3. Suivre **`z_docs/13-checklist-validation-mcp.md`** avant une démo ou la mise en production.
4. Lancer `npm run smoke -w backend` après build pour s’assurer que le backend répond correctement.

Une fois ces étapes faites, l’application peut fonctionner à 100 % côté MCP pour les providers que tu as configurés.

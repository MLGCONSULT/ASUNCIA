# 14 – Configurer les MCP pour que l’app fonctionne à 100 %

Ce guide indique **quoi mettre où** et **dans quel ordre** pour que chaque intégration MCP soit opérationnelle. Les variables listées sont la source de vérité minimale ; le détail conceptuel est dans `doc_technique/04-mcp-et-integrations.md` et la checklist de validation dans `doc_technique/13-checklist-validation-mcp.md`.

---

## 1. Où configurer ?

| Fichier | Rôle |
|--------|------|
| **Backend** : `backend-nest/.env` (ou `.env.prod` en prod) | URL MCP, tokens serveur, clés OAuth utilisées par le backend (**Airtable**, **n8n**, **Supabase**). |
| **Frontend** : `frontend/.env` | Supabase (affichage + auth), URL du backend. |

À chaque fois, créer `backend-nest/.env` et copier `frontend/.env.example` vers `frontend/.env.local`, puis remplir les valeurs.

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

**Backend `.env` (a completer selon les MCP utilises)**

- App : `PORT`, `FRONTEND_URL`, `NEXT_PUBLIC_SITE_URL`, `ALLOWED_ORIGINS`
- Supabase : `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, optionnel `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`
- OpenAI : `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL`
- n8n : `N8N_MCP_URL`, `N8N_MCP_ACCESS_TOKEN`
- Airtable : `AIRTABLE_MCP_URL`, `AIRTABLE_RUNTIME_MODE`, puis soit OAuth (redirect + client id/secret) soit `AIRTABLE_MCP_TOKEN` / `AIRTABLE_TOKEN`

**Frontend `.env`**

- Toujours : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BACKEND_URL`

## 5. Après configuration : valider pour de vrai

1. Tester chaque health check concerné (`/api/health/mcp-*`).
2. Dans l’app : connexion, puis utiliser chaque outil (Airtable, n8n, Supabase) au moins une fois selon le périmètre.
3. Suivre **`doc_technique/13-checklist-validation-mcp.md`** avant une démo ou la mise en production.
4. Lancer `npm run build` dans `backend-nest` pour s’assurer que le backend compile.

Une fois ces étapes faites, l’application peut fonctionner à 100 % côté MCP pour les providers que tu as configurés.

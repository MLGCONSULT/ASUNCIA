# 14 — Configurer les MCP (variables et ordre)

Ce guide répond à : **où mettre quoi**, et **dans quel ordre** brancher les intégrations. Tout repose sur le **MCP** et des **jetons serveur** côté backend. Le détail conceptuel est dans [`04-mcp-et-integrations.md`](04-mcp-et-integrations.md) ; la validation dans [`13-checklist-validation-mcp.md`](13-checklist-validation-mcp.md).

---

## Où configurer ?

| Fichier | Rôle |
|--------|------|
| `backend-nest/.env` (ou `.env.prod` en prod) | URLs MCP, **jetons serveur** pour **Airtable**, **n8n**, **Supabase** (assistant MCP). |
| `frontend/.env.local` (à partir de `frontend/.env.example`) | Supabase côté client, URL du backend. |

Créer `backend-nest/.env` à la main ; copier `frontend/.env.example` vers `frontend/.env.local` puis remplir.

---

## Ordre recommandé

1. **Supabase** — Sans lui, pas d’auth ni de base : l’app ne tourne pas correctement.
2. **Socle backend** — `PORT`, `FRONTEND_URL`, `NEXT_PUBLIC_SITE_URL`, `ALLOWED_ORIGINS`, `OPENAI_API_KEY` si vous utilisez le chat.
3. **Un MCP à la fois** — Configurer un fournisseur, vérifier son health check, puis passer au suivant.

---

## Par fournisseur

### Supabase (app + MCP optionnel pour l’assistant)

**Backend `.env`**

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Pour le MCP **assistant** : `SUPABASE_ACCESS_TOKEN` (token MCP Supabase). Optionnel : `SUPABASE_PROJECT_REF` si non déduit de l’URL.

**Frontend** — `NEXT_PUBLIC_SUPABASE_*`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BACKEND_URL`.

**Vérif** : l’app charge, la connexion marche ; `GET /api/health/mcp-supabase` → `200` avec infos utiles.

---

### n8n (MCP)

**Backend uniquement**

- `N8N_MCP_URL` — URL du serveur MCP n8n
- `N8N_MCP_ACCESS_TOKEN` — jeton d’accès au MCP

**Vérif** : `GET /api/health/mcp-n8n` → `200` ; `GET /api/n8n/workflows` une fois authentifié sur l’app.

---

### Airtable (MCP, server-token uniquement)

**Backend** — Mode **server-token** (configuration retenue pour ce projet) :

- `AIRTABLE_RUNTIME_MODE=server-token`
- `AIRTABLE_MCP_URL` — URL du serveur MCP Airtable
- `AIRTABLE_MCP_TOKEN` ou `AIRTABLE_TOKEN` — jeton côté serveur

**Vérif** : `GET /api/health/mcp-airtable` → `200` ; test d’accès aux bases depuis l’app via le MCP.

---

## Résumé des variables (mémo)

**Backend** — App : `PORT`, `FRONTEND_URL`, `NEXT_PUBLIC_SITE_URL`, `ALLOWED_ORIGINS`. Supabase : clés + `SUPABASE_SERVICE_ROLE_KEY`, optionnel `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`. OpenAI : `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL`. n8n : `N8N_MCP_URL`, `N8N_MCP_ACCESS_TOKEN`. Airtable : `AIRTABLE_RUNTIME_MODE=server-token`, `AIRTABLE_MCP_URL`, jetons serveur.

**Frontend** — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BACKEND_URL`.

---

## Après configuration

1. Tester chaque `/api/health/mcp-*` concerné.  
2. Dans l’app : connexion, puis **Airtable**, **n8n**, **Supabase** selon ce qui est activé.  
3. Suivre **`13-checklist-validation-mcp.md`** avant une démo ou la prod.  
4. `npm run build` dans `backend-nest` pour confirmer que le serveur compile.

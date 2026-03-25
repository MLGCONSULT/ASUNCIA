# Fiche technique rapide — AsuncIA

Ce fichier rassemble ce dont vous avez besoin pour **tester l’application en ligne**, **vérifier que l’API répond**, et **résumer le périmètre** sans parcourir tout le dossier `doc_technique/`. Le reste du dossier approfondit l’architecture, les choix produit et la configuration.

---

## URLs de démonstration

| Rôle | URL |
|------|-----|
| **Application web** | [https://asuncia.vercel.app](https://asuncia.vercel.app) |
| **API (NestJS)** | [https://asuncia-backend.vercel.app](https://asuncia-backend.vercel.app) |

À la racine de l’API, le navigateur affiche un petit message JSON (présence du service). Les routes métier sont sous `/api/...`.

---

## Contrôles « santé » (GET, lisibles dans le navigateur)

Remplacez `BASE` par `https://asuncia-backend.vercel.app`.

| URL | Rôle |
|-----|------|
| `BASE/` | Le serveur répond |
| `BASE/api/health/mcp-supabase` | Configuration MCP Supabase |
| `BASE/api/health/mcp-airtable` | Configuration MCP Airtable |
| `BASE/api/health/mcp-n8n` | Configuration MCP n8n |

Un **503** avec un message clair indique souvent qu’**une variable d’environnement manque** pour ce connecteur — pas forcément une panne générale du serveur.

---

## Architecture en trois lignes

- **Frontend** : Next.js, connexion via Supabase, appels à l’API avec `Authorization: Bearer <JWT>`.
- **Backend** : NestJS (`backend-nest/`), chat OpenAI, clients MCP vers Airtable, n8n et Supabase.
- **Données** : projet Supabase (comptes, conversations de l’assistant, données métier ; intégrations outils via **MCP** et **jetons serveur**).

---

## Variables d’environnement (résumé)

- **Backend** : clés Supabase serveur, `OPENAI_API_KEY`, `FRONTEND_URL` / `ALLOWED_ORIGINS`, variables MCP par outil. Liste détaillée dans [`04-mcp-et-integrations.md`](04-mcp-et-integrations.md) et [`14-guide-configuration-mcp.md`](14-guide-configuration-mcp.md).
- **Frontend** : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_BACKEND_URL` (URL de l’API, ex. `https://asuncia-backend.vercel.app`).

---

## Ce que l’interface met en avant

- Tableau de bord  
- **Airtable** (bases / tables / enregistrements via MCP)  
- **n8n** (workflows : liste, détail, exécution via API ; JSON **effectif** = graphe publié `activeVersion`, voir [`04-mcp-et-integrations.md`](04-mcp-et-integrations.md) et [`07-frontend.md`](07-frontend.md))  
- **Supabase** (éditeur SQL + liste des tables ; scroll dans les panneaux, voir [`07-frontend.md`](07-frontend.md))  
- **Chatbot Stacky** (`/app/chatbot`) : même parcours que la page publique [typebot.co/stacky-asuncian](https://typebot.co/stacky-asuncian), affichée dans l’app en **iframe**  
- **Assistant intégré** : un seul fil de conversation par utilisateur (pas de liste de chats séparés)  
- **Navigation** : dock **bas** en bulles colorées ; **recherche** en haut limitée aux **pages** (pas aux prompts assistant) — détail dans [`07-frontend.md`](07-frontend.md)

Il n’y a **pas d’écran « Leads »** dans l’app telle qu’elle est présentée aujourd’hui ; l’assistant ne devrait pas renvoyer vers une page qui n’existe pas.

---

## Pour aller plus loin

- [`README.md`](README.md) de ce dossier : **ordre de lecture** et rôle de chaque fichier  
- Code de référence : **`backend-nest/`** (NestJS). Un dossier `backend/` plus ancien peut traîner dans le dépôt ; **ce qui est décrit pour la prod, c’est NestJS.**

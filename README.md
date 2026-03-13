# SITE_FORMATION — Backend API + interface IA

Projet en **monorepo** : backend API complet (Express) et frontend Next.js centré sur l’interface IA. Déploiement sur **Vercel** (deux projets : frontend et backend).

## Structure

```
SITE_FORMATION/
├── frontend/     # Next.js — UI, auth Supabase, appelle le backend via API
├── backend/      # API Express — logique métier, MCP, IA, email, Supabase serveur
├── package.json  # workspaces: ["frontend", "backend"]
└── README.md
```

- **Backend** : priorité du projet. Expose toutes les routes API (chat, Airtable, Notion, n8n, Gmail, MCP, health, auth). Valide le JWT Supabase sur les routes protégées.
- **Frontend** : pages et composants IA, auth Supabase (connexion, inscription, callback). Envoie le JWT dans le header `Authorization: Bearer <token>` vers le backend.

## Prérequis

- Node.js 18+
- Compte [Supabase](https://supabase.com)

## Démarrage en local

### 1. Installer les dépendances

À la racine :

```bash
npm install
```

### 2. Backend

- Créer `backend/.env` avec les variables nécessaires (Supabase, OpenAI, SMTP, et **un serveur MCP par outil** : n8n, Gmail, Airtable, Notion — voir `backend/.env.example` et `backend/src/config/mcp.ts`).
- Démarrer le backend (ex. port 4000) :

```bash
cd backend
npm run build
npm run start
```

En développement :

```bash
cd backend
npm run dev
```

### 3. Frontend

- Créer `frontend/.env.local` avec au minimum :
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - **`NEXT_PUBLIC_BACKEND_URL`** = URL du backend (ex. `http://localhost:4000` en local).
- Démarrer le frontend :

```bash
cd frontend
npm run dev
```

Le frontend appelle le backend via `NEXT_PUBLIC_BACKEND_URL` et envoie le JWT Supabase à chaque requête protégée.

## Déploiement Vercel

- **Deux projets Vercel** liés au même dépôt (monorepo).
- **Projet 1 (frontend)**  
  - Root Directory : `frontend`  
  - Framework : Next.js  
  - Variable d’environnement : **`NEXT_PUBLIC_BACKEND_URL`** = URL du backend (ex. `https://api-xxx.vercel.app`).
- **Projet 2 (backend)**  
  - Root Directory : `backend`  
  - Build : sortie serverless (voir `backend/vercel.json`).  
  - Variables d’environnement : toutes les variables métier (Supabase, OpenAI, MCP, n8n, Gmail, email, etc.) sur ce projet.

Aucun changement côté serveurs MCP externes : les **clients** MCP restent dans le backend ; les variables MCP sont configurées sur le projet Vercel du backend.

## Base de données et migrations

Les migrations Supabase (schéma, RLS, OAuth, etc.) restent applicables telles quelles. À exécuter dans l’ordre depuis le dashboard Supabase (SQL Editor) ou via CLI.

## Documentation détaillée

- **Frontend** : voir `frontend/README.md` pour l’auth, les pages et les options (Gmail OAuth, etc.).
- **Backend** : voir les routes dans `backend/src/routes/` et la configuration dans `backend/`. Vérification et noms d’outils MCP : [backend/docs/MCP.md](backend/docs/MCP.md).

## Checks de production

À la racine du repo :

```bash
npm run check
```

Cette commande exécute :

- le typecheck / build du backend
- le build du frontend
- le smoke test du backend (`health` publics + contrôle des routes protégées)

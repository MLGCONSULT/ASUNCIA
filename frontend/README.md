# Frontend — Interface Next.js

Le frontend gère l’interface utilisateur, l’auth Supabase et les appels vers le **backend** (NestJS en production) via `NEXT_PUBLIC_BACKEND_URL`.

## Variables minimales

Copier `frontend/.env.example` vers `frontend/.env.local` puis renseigner :

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

En **production**, `NEXT_PUBLIC_BACKEND_URL` pointe vers l’API déployée, par exemple :

`https://asuncia-backend.vercel.app`

Les secrets (OpenAI, MCP, clés serveur) sont sur le **backend**, pas dans le frontend.

## Démarrage local

1. Installer les dépendances à la racine : `npm install`
2. Appliquer les migrations Supabase dans `frontend/supabase/migrations`
3. Démarrer le backend
4. Démarrer le frontend :

```bash
cd frontend
npm run dev
```

## Architecture

- `src/app` : routes Next.js
- `src/app/app` : zone authentifiée (dashboard, Airtable, n8n, Supabase, assistant)
- `src/lib/api.ts` : client HTTP vers le backend avec le JWT Supabase
- `src/lib/supabase` : clients Supabase navigateur / serveur

## Intégrations visibles dans le frontend

- **Airtable** — UI pilotée par le backend (OAuth ou token serveur)
- **n8n** — workflows et automatisation
- **Supabase** — données et requêtes guidées
- **Assistant IA** — chat intégré

## Vérifications recommandées

- `npm run build` doit réussir
- la connexion et l’inscription Supabase doivent fonctionner
- `/app/airtable`, `/app/n8n`, `/app/supabase` se chargent sans erreur de compilation

## Déploiement

- Projet frontend Vercel : racine **`frontend`**
- Projet backend Vercel : racine **`backend-nest`** (ou équivalent selon le repo)

Voir aussi `z_docs/DOC_TECHNIQUE.md` à la racine du monorepo.

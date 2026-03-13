# Frontend — Interface Next.js

Le frontend gère l’interface utilisateur, l’auth Supabase et les redirections OAuth côté web. Toute la logique métier, les routes protégées, l’IA et les intégrations MCP vivent côté backend Express.

## Variables minimales

Copier `frontend/.env.example` vers `frontend/.env.local` puis renseigner :

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Notes :

- `NEXT_PUBLIC_BACKEND_URL` doit pointer vers le backend Express.
- `NEXT_PUBLIC_SITE_URL` est utilisé par les callbacks Gmail côté frontend.
- Les secrets MCP, OpenAI, SMTP, Google OAuth serveur, Airtable, Notion et n8n ne vivent pas ici mais dans `backend/.env`.

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
- `src/app/app` : zone authentifiée
- `src/lib/api.ts` : client HTTP vers le backend avec le JWT Supabase
- `src/lib/supabase` : clients Supabase navigateur / serveur

## Intégrations visibles dans le frontend

- `Gmail` : démarrage OAuth via `src/app/api/auth/gmail/*`, données via le backend
- `Notion` : UI pilotée par le backend, support OAuth utilisateur et token serveur
- `Airtable` : UI pilotée par le backend, support OAuth utilisateur et token serveur
- `n8n` : interface de workflows via le backend

## Vérifications recommandées

- `npm run build` doit réussir
- la connexion et l’inscription Supabase doivent fonctionner
- `/app/mails`, `/app/notion`, `/app/airtable`, `/app/n8n` doivent répondre sans erreur de compilation
- les callbacks OAuth doivent rediriger vers `NEXT_PUBLIC_SITE_URL`

## Déploiement

Déployer le frontend et le backend comme deux projets distincts.

- projet frontend : racine `frontend`
- projet backend : racine `backend`
- variable essentielle côté frontend : `NEXT_PUBLIC_BACKEND_URL`

La documentation détaillée des MCP et des variables backend se trouve dans `backend/docs/MCP.md` et `backend/.env.example`.

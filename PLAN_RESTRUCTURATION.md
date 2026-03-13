# Plan : restructuration racine + frontend/backend + déploiement gratuit

## Objectifs

1. **Code à la racine** : plus de sous-dossier `asuncia/`, tout part de la racine du dépôt.
2. **Séparation frontend / backend** : un dossier `frontend/` et un dossier `backend/` pour clarifier les rôles et faciliter la maintenance.
3. **Tout fonctionne** : app, auth, API, clients MCP (Supabase, n8n, Airtable, Notion, Gmail).
4. **Code simple et maintenable** : responsabilités claires, pas de duplication inutile.
5. **Déploiement gratuit** : Netlify pour le frontend ; proposition d’options pour le backend.

---

## Contexte actuel

- **Une seule app Next.js** dans `asuncia/` : pages (App Router), composants, **et** toutes les API routes (chat, Airtable, Notion, n8n, Gmail, auth, MCP, etc.).
- **Clients MCP** : uniquement des **clients** dans `src/lib/mcp/` qui appellent des **serveurs MCP externes** (Supabase MCP, n8n, Airtable, Notion, Gmail). Aucun serveur MCP n’est hébergé dans le projet.
- **Auth** : Supabase (SSR avec cookies Next.js) ; chaque route API utilise `createClient()` (Next) puis `getUser()`.
- **Déploiement actuel** : un seul déploiement Netlify (Next.js + plugin OpenNext = front + API en serverless).

---

## Choix d’architecture : deux options

### Option A (recommandée) : Monorepo, un seul déploiement Netlify

**Idée** : garder une seule application déployée (Netlify), mais organiser le code en `frontend/` et `backend/` **dans le même repo**. Le “backend” est la **logique partagée** (lib, MCP, AI, email, Supabase côté serveur) ; les **API routes restent dans Next.js** et ne font qu’importer et appeler ce code.

**Avantages** : un seul déploiement, gratuit, pas de CORS ni de gestion d’URL backend, auth Supabase inchangée (cookies Next). Idéal pour rester simple et gratuit.

**Structure cible :**

```
SITE_FORMATION/                    # racine du dépôt
├── frontend/                       # Application Next.js (UI + API routes)
│   ├── src/
│   │   ├── app/                    # App Router (pages, layout, api/)
│   │   ├── components/
│   │   └── lib/                    # Uniquement ce qui est spécifique Next (supabase client SSR, middleware)
│   ├── public/
│   ├── package.json                # next, react, framer-motion, @supabase/ssr, etc.
│   ├── next.config.mjs
│   ├── netlify.toml
│   ├── tsconfig.json
│   └── ...
├── backend/                        # Logique métier partagée (pas un serveur HTTP séparé)
│   ├── src/
│   │   ├── mcp/                    # Clients MCP (airtable, notion, n8n, gmail, supabase)
│   │   ├── ai/                     # tools-definitions, tool-executor, prompt
│   │   ├── supabase/               # Création client serveur (côté API) si besoin hors Next
│   │   ├── email.ts
│   │   ├── airtable.ts
│   │   ├── notion.ts
│   │   ├── gmail.ts
│   │   └── n8n/
│   ├── package.json                # openai, nodemailer, @modelcontextprotocol/sdk, @supabase/supabase-js, zod
│   └── tsconfig.json
├── package.json                    # workspaces: ["frontend", "backend"]
├── .gitignore
└── README.md
```

- **frontend** : contient tout l’App Router, les composants, et les **API routes** (`frontend/src/app/api/*`). Chaque route fait `import { ... } from '@repo/backend'` (ou path relatif selon config) et utilise la logique backend (MCP, AI, email, etc.).
- **backend** : aucun serveur HTTP ; uniquement des modules exportés (fonctions, clients). Les API routes Next.js restent le seul “point d’entrée” HTTP.
- **Auth** : inchangée. Supabase SSR + cookies dans Next (middleware, `createClient()` dans les routes).
- **Déploiement** : un seul site Netlify, **Base directory** = `frontend` (ou racine avec build command qui va dans `frontend`). Build = `npm run build` dans `frontend/`. Les API routes sont alors déployées comme Netlify Functions (OpenNext).

**Points à faire :**

1. Créer `frontend/` et `backend/` à la racine.
2. Déplacer le code actuel de `asuncia/` vers `frontend/` (app, components, config Next/Netlify, etc.) en adaptant les chemins.
3. Extraire dans `backend/` tout ce qui est “logique métier” : `lib/mcp`, `lib/ai`, `lib/email`, `lib/airtable`, `lib/notion`, `lib/gmail`, `lib/n8n`, et la partie “serveur” Supabase réutilisable (si on factorise). Les API routes dans `frontend` importent depuis `backend`.
4. Configurer le monorepo : `package.json` racine avec workspaces ; `frontend/package.json` avec dépendance vers `backend` (e.g. `"backend": "workspace:*"` ou `"file:../backend"`). Alias TypeScript dans `frontend` pour `@repo/backend` ou équivalent pointant vers `../backend/src`.
5. Mettre à jour `netlify.toml` (et Netlify UI) : base directory = `frontend`, build = `npm run build`, plugin Next.js.
6. Vérifier que les clients MCP (backend) reçoivent bien les variables d’env (elles restent sur le build Netlify, dans les paramètres du site).
7. Tests : build, smoke des routes API (chat, health MCP, Airtable, Notion, n8n, Gmail), auth et déploiement Netlify.

---

### Option B : Backend séparé (deux déploiements)

**Idée** : un **vrai** serveur backend (Node/Express ou Hono) dans `backend/`, déployé sur un hébergeur gratuit ; le **frontend** (Next.js) ne contient plus les API routes (ou seulement auth callback) et appelle le backend via une URL (`NEXT_PUBLIC_BACKEND_URL`).

**Avantages** : séparation nette front/back, possibilité de scaler ou de changer le backend indépendamment.  
**Inconvénients** : deux déploiements, CORS, gestion des variables d’env en deux endroits, auth à faire passer (JWT Supabase du front vers le back).

**Structure cible (résumée) :**

```
SITE_FORMATION/
├── frontend/                 # Next.js (pages, composants, auth callback uniquement)
│   └── Appel API vers BACKEND_URL pour tout le reste
├── backend/                  # Serveur Express (ou Hono) avec toutes les routes API
│   ├── src/
│   │   ├── routes/           # chat, airtable, notion, n8n, gmail, mcp, health, auth helpers
│   │   ├── mcp/, ai/, ...
│   │   └── index.ts
│   └── package.json
└── package.json               # workspaces
```

- **Auth** : le frontend envoie le JWT Supabase (cookie ou `Authorization: Bearer <token>`) au backend ; le backend valide avec `supabase.auth.getUser(jwt)` (ou équivalent) et utilise `user.id` pour les données.
- **Déploiement backend gratuit** (recommandations) :
  - **Render** (Web Service, free tier) : le plus simple, spin down après inactivité.
  - **Railway** : crédit gratuit mensuel, bien pour un petit API.
  - **Fly.io** : free tier avec petites VMs, plus technique.
  - **Vercel** (serverless) : possible en backend séparé (monorepo avec `backend/` = Vercel project), gratuit.

Si tu veux aller vers l’option B plus tard, on pourra détailler les étapes (migration des routes, CORS, env, déploiement Render/Railway) dans un second temps.

---

## Recommandation

- **Court terme / simplicité / 100 % gratuit** : **Option A** (monorepo frontend + backend en lib, un seul déploiement Netlify).
- **Backend “hébergement gratuit”** : avec l’option A, le “backend” est déjà hébergé gratuitement via les **Netlify Functions** (générées par OpenNext à partir des API routes Next.js). Aucun second service à payer.
- Si plus tard tu veux un **vrai serveur backend** (Node persistant, WebSockets, etc.) : on pourra passer à l’**Option B** et te guider pour Render ou Railway en gratuit.

---

## Étapes concrètes (Option A)

1. **Créer la structure**  
   - Créer `frontend/` et `backend/` à la racine.  
   - Fichier `package.json` racine avec `"private": true` et `"workspaces": ["frontend", "backend"]`.

2. **Remplir `backend/`**  
   - Copier / déplacer depuis `asuncia/src/lib` : `mcp/`, `ai/`, `email.ts`, `airtable.ts`, `notion.ts`, `gmail.ts`, `email-templates.ts`, `n8n/`, `leads.ts`.  
   - Adapter les imports internes (chemins relatifs ou alias).  
   - Créer `backend/package.json` avec les deps : `openai`, `nodemailer`, `zod`, `@modelcontextprotocol/sdk`, `@supabase/supabase-js`.  
   - Exposer un point d’entrée propre (ex. `backend/src/index.ts` qui réexporte les modules utilisés par le frontend).

3. **Remplir `frontend/`**  
   - Déplacer tout le contenu de `asuncia/` dans `frontend/` (src, public, next.config, netlify.toml, tsconfig, postcss, tailwind, etc.).  
   - Dans `frontend/package.json` : garder Next, React, Supabase SSR, framer-motion, etc. ; ajouter la dépendance au workspace `backend`.  
   - Remplacer dans les API routes les imports `@/lib/...` par des imports depuis le package `backend` (ex. `import { executeTool } from 'backend'` ou alias `@repo/backend`).

4. **Supabase côté frontend**  
   - Garder dans `frontend/src/lib/` uniquement ce qui est lié à Next : `supabase/server.ts` (createClient avec cookies), `supabase/client.ts`, `supabase/middleware.ts`.  
   - Les API routes restent dans le frontend et utilisent ce `createClient()` ; elles appellent la logique métier dans `backend` (tool-executor, MCP, etc.) en passant `supabase` et `userId` si besoin.

5. **Types et alias**  
   - `frontend/tsconfig.json` : alias `"@/*"` vers `./src/*` ; alias `"backend"` ou `"@repo/backend"` vers `../backend/src` (ou vers le build du backend).  
   - S’assurer que `backend` compile en TypeScript (tsconfig, `main`/`types` dans package.json) pour que le frontend ait les types.

6. **Netlify**  
   - `netlify.toml` dans `frontend/` (ou à la racine avec `base = "frontend"`).  
   - Build command : `npm run build` (exécuté depuis la racine avec workspaces, ou depuis `frontend/` selon comment tu configures Netlify).  
   - Publish directory : géré par le plugin Next.js.  
   - Variables d’environnement : inchangées (toujours dans Netlify UI), utilisées au build et en runtime par les Functions.

7. **Nettoyage**  
   - Supprimer le dossier `asuncia/` une fois que tout est migré et vérifié.  
   - Mettre à jour `.gitignore` (racine) et éventuellement `frontend/.gitignore`.

8. **Vérifications**  
   - `npm install` à la racine.  
   - `npm run build` (dans frontend ou depuis racine selon scripts).  
   - Lancer le serveur de dev, tester : login, chat, health MCP (Airtable, n8n, Notion, Gmail), Airtable/Notion/n8n/Gmail, déconnexion.  
   - Déployer sur Netlify et refaire les mêmes vérifications.

---

## MCP : rappel

- Les **serveurs MCP** (Airtable, Notion, n8n, Gmail, Supabase) sont **externes** (URLs configurées par variables d’env).  
- Le projet ne fait qu’**appeler** ces serveurs (clients dans `backend/src/mcp/`).  
- Après restructuration, il suffit que les **variables d’env** (Netlify) pointent vers les bonnes URLs/tokens ; aucun changement côté “hébergement” des MCP.

---

## Résumé

| Élément        | Option A (recommandée)                          | Option B (alternative)          |
|----------------|--------------------------------------------------|---------------------------------|
| Frontend       | `frontend/` (Next.js, UI + API routes)           | `frontend/` (Next.js, UI seul)  |
| Backend        | `backend/` (lib uniquement)                       | `backend/` (serveur Express)    |
| Déploiement    | Un seul : Netlify (frontend = Next + Functions)  | Deux : Netlify + Render/Railway |
| Coût           | Gratuit                                          | Gratuit (tiers gratuits)        |
| MCP            | Inchangés (clients dans backend, env sur Netlify)| Idem (env sur backend)          |

En suivant ce plan avec l’**Option A**, tu auras le code à la racine, séparé en `frontend/` et `backend/`, tout en gardant un déploiement unique et gratuit sur Netlify, avec les clients MCP fonctionnels et un code plus clair à maintenir.

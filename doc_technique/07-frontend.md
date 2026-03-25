# 07 — Frontend

## Rôle

Le **Next.js** rend l’application **visible et utilisable** : pages, navigation, session utilisateur, appels à l’API. La **logique métier lourde** reste volontairement côté serveur.

## Ce que couvre le front

Accueil public, connexion, inscription, zone connectée, **navigation** (dock en bas de l’app), pages **Airtable**, **Supabase**, **n8n**, **chatbot Stacky** (iframe), **dashboard**, **assistant**. Les **appels** vers ces outils passent par l’**API** (MCP côté backend, jetons serveur), pas par une connexion « compte personnel » dans le navigateur pour Airtable.

L’**accueil public** a été resserré pour tenir sur un écran laptop sans scroll excessif, tout en gardant l’identité visuelle du site — première impression compte.

## Dialogue avec l’API

Un **client HTTP** (`frontend/src/lib/api.ts`) ajoute le **JWT** Supabase quand c’est nécessaire. Le front **demande** ; le serveur **décide**.

## Pages principales (aperçu)

Accueil marketing, **dashboard**, vues **Airtable**, **Supabase**, **n8n**, page **Chatbot** (Typebot). L’idée est que ces écrans ne soient pas des **îlots** : l’assistant et les **intentions** (cartes, raccourcis) aident à passer de l’un à l’autre.

### Page Workflows (n8n)

Fichier : `frontend/src/app/app/n8n/N8nView.tsx`.

- **Liste** des workflows via `GET /api/n8n/workflows` (paramètres optionnels côté API : `limit` borné comme le MCP, `query`, `projectId`).
- **Détail** via `GET /api/n8n/workflows/:id` ; **exécution** via `POST .../execute` (corps JSON ; le backend complète les `inputs` MCP si besoin).
- **JSON affiché** — deux vues :
  - **Effectif** (par défaut) : graphe proche d’un **export n8n** (`nodes`, `connections`, `pinData`, `meta`) dérivé surtout de **`activeVersion`** dans la réponse MCP, car la racine `workflow` reflète souvent le **brouillon**.
  - **Réponse MCP** : objet `workflow` brut tel que renvoyé par l’API (scopes, métadonnées, brouillon, etc.).
- **Copier** : copie le contenu de la vue active (effectif ou MCP).
- **Actualiser** : recharge le détail du workflow sélectionné depuis l’API.

## Navigation

Si la navigation ressemble à une **liste de modules techniques**, l’utilisateur ne voit qu’un catalogue d’outils. Si elle est **guidée**, il voit plutôt un **parcours** vers un objectif — c’est le second cas que le projet vise.

## Fichiers de référence

- `frontend/src/app/`
- `frontend/src/app/page.tsx`
- `frontend/src/app/app/n8n/N8nView.tsx`
- `frontend/src/components/`
- `frontend/src/lib/api.ts`
- `frontend/src/lib/supabase/`

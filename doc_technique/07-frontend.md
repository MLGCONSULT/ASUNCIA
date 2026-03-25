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

## Navigation

Si la navigation ressemble à une **liste de modules techniques**, l’utilisateur ne voit qu’un catalogue d’outils. Si elle est **guidée**, il voit plutôt un **parcours** vers un objectif — c’est le second cas que le projet vise.

## Fichiers de référence

- `frontend/src/app/`
- `frontend/src/app/page.tsx`
- `frontend/src/components/`
- `frontend/src/lib/api.ts`
- `frontend/src/lib/supabase/`

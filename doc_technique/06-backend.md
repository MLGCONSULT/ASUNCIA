# 06 - Backend (NestJS)

## Role du backend

Le backend NestJS (`backend-nest/`) est le centre de gravite technique du projet.

Il gere :

- l'API HTTP (`/api/...`)
- la verification du JWT Supabase
- les integrations metier
- les clients MCP
- la logique du chat IA
- les validations d'entree
- les health checks

## Pourquoi ce role est important

Si le backend restait trop fin, la logique serait dispersee entre le frontend, les providers externes et les callbacks OAuth. Ce serait plus difficile a faire evoluer et plus difficile a securiser.

Le choix retenu ici est donc bon pour un projet d'alternance : il montre une architecture pensee, pas seulement un assemblage de pages.

## Organisation actuelle

Le backend est structure en modules NestJS typiques :

- `controllers` pour les entrees HTTP
- `services` pour la logique reutilisable
- `mcp` pour les clients MCP
- middleware d'authentification utilisateur
- persistance OAuth pour fiabiliser les flux en serverless

La reference de deploiement est **`backend-nest`** (pas l'ancienne API Express du dossier `backend/`, si elle est encore presente dans le depot).

## Routes importantes

Quelques familles de routes ressortent particulierement :

- `chat` (assistant IA)
- `conversation` / `conversations`
- `airtable`
- `n8n`
- `mcp`
- `health`

## Validation

Le backend utilise des DTO et validateurs pour fiabiliser les entrees. C'est un point fort important, car il reduit les erreurs runtime et rend les contrats d'API plus clairs.

## IA et orchestration

Le backend prepare les messages, la conversation, les outils disponibles et execute les actions demandees par l'assistant. C'est donc bien plus qu'une simple API CRUD.

## Qualites techniques deja visibles

- separation modules / services / controleurs
- prise en charge de MCP
- health checks
- persistance OAuth compatible serverless
- mode de runtime explicite pour `Airtable` (`oauth` vs `server-token`)

## Vigilance pour la suite

Le backend doit toujours rester :

- la couche d'orchestration
- le point de validation
- le point de gestion des erreurs
- la couche qui protege les secrets et les appels sensibles

Il doit aussi rester le point qui decide du mode runtime retenu pour chaque integration. Le frontend ne doit pas deviner si `Airtable` tourne en `oauth` ou en `server-token`.

## Fichiers de reference

- `backend-nest/src/main.ts`
- `backend-nest/src/app.module.ts`
- `backend-nest/src/chat/chat.controller.ts`
- `backend-nest/src/health/health-mcp.controller.ts`
- `backend-nest/src/services/oauth-state.ts`
- `backend-nest/src/config/mcp.ts`

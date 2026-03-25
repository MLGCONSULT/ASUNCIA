# 06 - Backend

## Role du backend

Le backend est le centre de gravite technique du projet.

Il gere :

- l'API HTTP
- la verification du JWT
- les integrations metier
- les clients MCP
- la logique du chat IA
- les validations d'entree
- les health checks et les tests de fumee

## Pourquoi ce role est important

Si le backend restait trop fin, la logique serait dispersee entre le frontend, les providers externes et les callbacks OAuth. Ce serait plus difficile a faire evoluer et plus difficile a securiser.

Le choix retenu ici est donc bon pour un projet d'alternance : il montre une architecture pensee, pas seulement un assemblage de pages.

## Organisation actuelle

Le backend est structure autour de plusieurs briques :

- `routes` pour les entrees HTTP
- `services` pour la logique reutilisable
- `mcp` pour les clients MCP
- `validators` pour les schemas de validation
- `middleware` pour les controles transverses

Un point important de la version actuelle est l'ajout de services dedies a la fiabilisation OAuth, notamment pour persister les etats temporaires et stabiliser certains clients providers.

## Routes importantes

Quelques familles de routes ressortent particulierement :

- `chat`
- `gmail`
- `airtable`
- `notion`
- `n8n`
- `mcp`
- `health`

## Validation

Le backend utilise des schemas pour fiabiliser les entrees. C'est un point fort important, car il reduit les erreurs runtime et rend les contrats d'API plus clairs.

## IA et orchestration

Le backend prepare les messages, la conversation, les outils disponibles et execute les actions demandees par l'assistant. C'est donc bien plus qu'une simple API CRUD.

## Qualites techniques deja visibles

- separation routes / services / validateurs
- prise en charge de MCP
- health checks
- smoke tests
- scripts de verification
- persistance OAuth compatible serverless
- modes de runtime explicites pour `Notion` et `Airtable`

## Vigilance pour la suite

Le backend doit toujours rester :

- la couche d'orchestration
- le point de validation
- le point de gestion des erreurs
- la couche qui protege les secrets et les appels sensibles

Il doit aussi rester le point qui decide du mode runtime retenu pour chaque integration. Le frontend ne doit pas deviner si `Airtable` ou `Notion` tournent en `oauth` ou en `server-token`.

## Fichiers de reference

- `backend/src/index.ts`
- `backend/src/server.ts`
- `backend/src/routes/`
- `backend/src/services/`
- `backend/src/services/oauth-state.ts`
- `backend/src/validators/schemas.ts`
- `backend/scripts/smoke.mjs`

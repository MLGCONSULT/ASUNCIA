# 06 — Backend (NestJS)

## Rôle

Le dossier **`backend-nest/`** concentre l’**API HTTP** (`/api/...`), la **vérification du JWT** Supabase, les **clients MCP** (Airtable, n8n, Supabase), **le chat IA**, la **validation** des entrées et les **health checks**. C’est le **centre de gravité** du système.

## Organisation

Structure **NestJS** : modules, contrôleurs, services, middleware d’auth, couche **MCP**. Les **secrets** des intégrations (jetons serveur, URLs MCP) vivent dans les **variables d’environnement** du serveur. Le déploiement de référence est **`backend-nest`**.

## Familles de routes utiles à connaître

Chat (assistant), conversations, Airtable, n8n, MCP, health. Le détail est dans `backend-nest/src/`. Pour **n8n**, les appels MCP passent par `mcp/n8n-client.ts` (normalisation des arguments `execute_workflow`, alignement sur les outils `search_workflows` / `get_workflow_details` / `execute_workflow` de l’instance) et `n8n/n8n.controller.ts` pour les routes HTTP `/api/n8n/...`.

## Validation

Les entrées passent par des **DTO** et validateurs : moins d’erreurs en production, contrats d’API plus lisibles.

## IA

Le backend **assemble** l’historique, les outils MCP disponibles et les réponses du modèle ; **exécute** les actions autorisées. Ce n’est pas une API CRUD « plate ».

## Points déjà solides

Séparation des couches, **MCP**, health checks, **secrets serveur** pour les connecteurs.

## Ce qui doit rester vrai

Le serveur reste **l’autorité** pour la validation, les erreurs et les **secrets** ; le **front** ne porte pas la configuration MCP.

## Fichiers de référence

- `backend-nest/src/main.ts`
- `backend-nest/src/app.module.ts`
- `backend-nest/src/chat/chat.controller.ts`
- `backend-nest/src/health/health-mcp.controller.ts`
- `backend-nest/src/config/mcp.ts`

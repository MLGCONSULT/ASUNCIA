# 04 - MCP et integrations

## Qu'est-ce que MCP dans ce projet

`MCP` signifie `Model Context Protocol`. Dans ce projet, il sert de pont standardise entre le backend et plusieurs outils externes.

Concretement, le backend NestJS ne parle pas directement a tous les services de maniere artisanale. Il passe par des clients MCP quand cela est pertinent.

## Idee generale

Le backend (`backend-nest`) est client MCP pour :

- `Supabase`
- `n8n`
- `Airtable`

Cela permet d'avoir une couche d'acces plus uniforme et plus simple a faire evoluer.

## Pourquoi ce choix est pertinent

Dans un projet centre sur l'IA, MCP apporte plusieurs benefices :

- clarifier les points d'entree techniques
- rendre certaines actions plus faciles a exposer au modele
- mieux separer la logique d'orchestration et la logique fournisseur
- garder de la souplesse si un provider ou un usage change

## Integrations principales

### Supabase MCP

`Supabase MCP` est utile pour certaines operations outillees autour de la base. Dans le projet, il reste optionnel mais fortement coherent avec l'architecture generale.

Variables importantes :

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF` ou `NEXT_PUBLIC_SUPABASE_URL`

### n8n MCP

`n8n` represente la couche d'automatisation. Le backend se connecte a un serveur MCP `n8n` avec un token serveur.

Variables importantes :

- `N8N_MCP_URL`
- `N8N_MCP_ACCESS_TOKEN`

### Airtable MCP

`Airtable` supporte deux modes dans le projet :

- `OAuth utilisateur`
- `token serveur`

Cela permet de s'adapter a plusieurs contextes d'usage, mais cela oblige a bien documenter le mode retenu.

En pratique, le projet sait figer ce choix avec `AIRTABLE_RUNTIME_MODE` :

- `oauth`
- `server-token`
- `auto` pour le developpement

En production, il vaut mieux choisir explicitement `oauth` ou `server-token` pour eviter tout comportement ambigu.

## Health checks

Le projet expose des routes de health pour verifier l'etat des integrations. C'est un bon point pour la production et pour la demonstration du projet.

Exemples :

- `/api/health/mcp-supabase`
- `/api/health/mcp-n8n`
- `/api/health/mcp-airtable`

Les reponses indiquent aussi le `selectedMode` retenu pour `Airtable` quand c'est pertinent, ce qui aide a comprendre rapidement comment le runtime est cense fonctionner.

## Ce qui a ete durci pour la production

Pour rendre les MCP plus fiables, plusieurs garde-fous ont ete ajoutes :

- persistance Supabase des etats OAuth temporaires au lieu d'un simple store memoire
- modes explicites `oauth` ou `server-token` pour `Airtable`
- checklist reelle de validation a suivre avant demonstration ou mise en production

## Ce qu'il faut toujours preserver

Si l'architecture evolue, il faut garder :

- la compatibilite `n8n` via MCP
- la compatibilite `Supabase` via MCP
- la compatibilite `Airtable` via MCP
- des checks d'etat lisibles
- une documentation claire du mode de connexion retenu

## Fichiers de reference

- `backend-nest/src/config/mcp.ts`
- `backend-nest/src/mcp/`
- `backend-nest/src/health/health-mcp.controller.ts`
- `backend-nest/src/services/oauth-state.ts`
- `doc_technique/13-checklist-validation-mcp.md`
- `doc_technique/14-guide-configuration-mcp.md`

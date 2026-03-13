# 04 - MCP et integrations

## Qu'est-ce que MCP dans ce projet

`MCP` signifie `Model Context Protocol`. Dans ce projet, il sert de pont standardise entre le backend et plusieurs outils externes.

Concretement, le backend ne parle pas directement a tous les services de maniere artisanale. Il passe par des clients MCP quand cela est pertinent.

## Idee generale

Le backend est client MCP pour :

- `Supabase`
- `n8n`
- `Gmail`
- `Airtable`
- `Notion`

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

### Gmail MCP

`Gmail` combine deux dimensions :

- un serveur MCP pour les outils
- un token OAuth utilisateur pour l'acces au compte

Le mode retenu pour la production est desormais clair : `lecture + envoi`.

Autrement dit, si l'application propose `send_email` dans le backend, le scope OAuth demande doit couvrir a la fois la lecture et l'envoi. Cela evite un ecart entre ce que l'interface promet et ce que Google autorise reellement.

Variables importantes :

- `GMAIL_MCP_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### Airtable MCP

`Airtable` supporte deux modes dans le projet :

- `OAuth utilisateur`
- `token serveur`

Cela permet de s'adapter a plusieurs contextes d'usage, mais cela oblige a bien documenter le mode retenu.

En pratique, le projet sait maintenant figer ce choix avec `AIRTABLE_RUNTIME_MODE` :

- `oauth`
- `server-token`
- `auto` pour le developpement

En production, il vaut mieux choisir explicitement `oauth` ou `server-token` pour eviter tout comportement ambigu.

### Notion MCP

`Notion` supporte lui aussi deux modes :

- serveur officiel avec `OAuth`
- serveur alternatif ou open-source avec token serveur

Le point important est de ne jamais melanger les deux sans le dire clairement.

La meme logique de clarification existe maintenant avec `NOTION_RUNTIME_MODE`.

De plus, le projet ne depend plus uniquement de la memoire du serveur pour le flux OAuth temporaire. Les etats en attente sont persistes, et le client OAuth Notion peut etre stabilise d'un redeploiement a l'autre.

## Health checks

Le projet expose des routes de health pour verifier l'etat des integrations. C'est un bon point pour la production et pour la demonstration du projet.

Exemples :

- `/api/health/mcp-supabase`
- `/api/health/mcp-n8n`
- `/api/health/mcp-gmail`
- `/api/health/mcp-airtable`
- `/api/health/mcp-notion`

Les reponses indiquent aussi le `selectedMode` retenu pour `Airtable` et `Notion`, ce qui aide a comprendre rapidement comment le runtime est cense fonctionner.

## Ce qui a ete durci pour la production

Pour rendre les MCP plus fiables, plusieurs garde-fous ont ete ajoutes :

- persistance Supabase des etats OAuth temporaires au lieu d'un simple store memoire
- persistance du client OAuth `Notion` pour mieux supporter les cold starts
- mode `Gmail` aligne entre la lecture et l'envoi
- modes explicites `oauth` ou `server-token` pour `Airtable` et `Notion`
- checklist reelle de validation a suivre avant demonstration ou mise en production

## Ce qu'il faut toujours preserver

Si l'architecture evolue, il faut garder :

- la compatibilite `n8n` via MCP
- la compatibilite `Supabase` via MCP
- la possibilite d'orchestrer `Gmail`, `Notion` et `Airtable`
- des checks d'etat lisibles
- une documentation claire du mode de connexion retenu

## Fichiers de reference

- `backend/src/config/mcp.ts`
- `backend/docs/MCP.md`
- `backend/src/mcp/`
- `backend/src/routes/health.ts`
- `backend/src/services/oauth-state.ts`
- `z_docs/13-checklist-validation-mcp.md`

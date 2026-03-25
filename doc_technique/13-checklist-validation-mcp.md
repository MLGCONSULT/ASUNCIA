# 13 — Checklist avant démo ou mise en production (MCP)

## Objectif

Des variables d’environnement **remplies** ne prouvent pas qu’une intégration **fonctionne**. Cette liste aide à vérifier **dans des conditions réalistes** : health check, route métier, puis **un cas concret** de bout en bout.

## Quand la passer

Avant une **démonstration** importante, une recette de préproduction, ou une **mise en ligne** où vous voulez éviter les mauvaises surprises.

## Supabase MCP

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF` ou cohérence avec `NEXT_PUBLIC_SUPABASE_URL`
- `GET /api/health/mcp-supabase`
- `POST /api/mcp/call` avec `toolName: "list_tools"`

## n8n MCP

- `N8N_MCP_URL`
- `N8N_MCP_ACCESS_TOKEN`
- `GET /api/health/mcp-n8n`
- `GET /api/n8n/workflows`
- Au moins **une exécution réelle** de workflow sur un environnement de test

## Airtable MCP (server-token)

- `AIRTABLE_RUNTIME_MODE=server-token`
- `AIRTABLE_MCP_URL` et jeton serveur (`AIRTABLE_MCP_TOKEN` ou `AIRTABLE_TOKEN`)
- `GET /api/health/mcp-airtable`
- Lecture d’une **base** et d’une **table** de test, éventuellement une **écriture** de test si le cas le permet

## Vérifications transverses

Les **états** affichés dans l’app restent **cohérents** après un **redéploiement** ; `npm run build` dans `backend-nest` **réussit** ; la doc **reflète** encore ce que vous venez de tester.

## Lecture des résultats

Si une intégration passe **variables + health + route métier + cas réel**, vous pouvez dire qu’elle **tient la route**. Si elle ne passe que le health check, elle est **configurée**, pas encore **fiable** en production.

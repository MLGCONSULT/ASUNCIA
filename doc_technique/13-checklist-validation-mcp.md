# 13 - Checklist de validation MCP

## Pourquoi cette page existe

Configurer des variables d'environnement ne suffit pas a prouver qu'une integration fonctionne vraiment.

Cette checklist sert a verifier les MCP dans des conditions proches du reel, avec une logique simple : s'assurer que le health check repond, que la route metier fonctionne, puis qu'un vrai cas d'usage passe de bout en bout.

## Regle simple

Avant une demonstration importante, une recette de preproduction ou une mise en production, il faut passer cette checklist.

## Supabase MCP

Verifier :

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF` ou la deduction via `NEXT_PUBLIC_SUPABASE_URL`
- `GET /api/health/mcp-supabase`
- `POST /api/mcp/call` avec `toolName: "list_tools"`

## n8n MCP

Verifier :

- `N8N_MCP_URL`
- `N8N_MCP_ACCESS_TOKEN`
- `GET /api/health/mcp-n8n`
- `GET /api/n8n/workflows`
- au moins une execution reelle de workflow sur un environnement de test

## Gmail MCP

Verifier :

- `GMAIL_MCP_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- le callback frontend exact : `https://<frontend-domain>/api/auth/gmail/callback`
- `GET /api/health/mcp-gmail`
- une connexion OAuth complete
- la lecture d'au moins un message
- l'envoi d'un mail de test, car le mode retenu est `lecture + envoi`

## Notion MCP

Verifier d'abord le mode retenu :

- `NOTION_RUNTIME_MODE=oauth`
- ou `NOTION_RUNTIME_MODE=server-token`

Puis verifier :

- `GET /api/health/mcp-notion`
- une recherche reelle
- une lecture ou requete de base reelle
- si mode `oauth`, un redeploiement ou un cold start pour confirmer que le client OAuth reste stable

## Airtable MCP

Verifier d'abord le mode retenu :

- `AIRTABLE_RUNTIME_MODE=oauth`
- ou `AIRTABLE_RUNTIME_MODE=server-token`

Puis verifier :

- `GET /api/health/mcp-airtable`
- la lecture d'une base de test
- la lecture d'une table de test
- une ecriture de test si le cas d'usage l'autorise

## Verification transverse

En plus des checks provider par provider, il faut aussi verifier :

- que les callbacks OAuth ne cassent pas apres redeploiement
- que les etats de connexion visibles par l'utilisateur restent coherents
- que `npm run smoke -w backend` passe toujours
- que la documentation `doc_technique` raconte encore la verite

## Conclusion

Si une integration passe les variables, le health check, la route metier et un cas reel, on peut commencer a dire qu'elle fonctionne vraiment.

Si elle ne passe qu'un health check, elle est seulement "configuree", pas encore "fiable".

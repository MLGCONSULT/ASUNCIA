# 05 — Authentification

## Deux niveaux à ne pas confondre

**1. Compte sur l’application** — L’utilisateur se connecte via **Supabase Auth**. Le front envoie un **JWT** à l’API NestJS (`Authorization: Bearer <token>`). Le serveur vérifie ce jeton avant d’ouvrir les routes protégées.

**2. Accès aux outils via MCP** — **Airtable**, **n8n** et **Supabase** sont utilisés **via MCP** dans ce projet. Les **jetons serveur** (Airtable, n8n, token MCP Supabase) sont **uniquement** dans le **backend** ; ils ne transitent pas par le navigateur. Il n’y a **pas** de parcours « connecter mon compte Airtable » côté utilisateur : tout passe par des **secrets serveur** et le **MCP**.

## Flux principal (application)

Connexion sur le front → Supabase crée la session → le front envoie le JWT au backend → les routes protégées deviennent accessibles.

## Ce que ce mécanisme apporte

Le projet ne se réduit pas à un formulaire de login : **l’app** sait qui est l’utilisateur (Supabase), et **l’API** sait parler aux outils **en son nom** via MCP, **sans exposer** les secrets d’intégration dans le front.

## Règles simples

- **Secrets MCP et jetons serveur** : uniquement dans `backend-nest` (variables d’environnement), jamais dans le client.
- **JWT** : transmis au backend pour les appels API, pas pour remplacer la config MCP.

## Fichiers de référence

- `frontend/src/lib/supabase/`
- `frontend/src/lib/api.ts`
- `backend-nest/src/middleware/auth-user.ts`
- `backend-nest/src/config/mcp.ts`

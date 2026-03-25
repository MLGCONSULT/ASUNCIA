# 03 — Base de données et Supabase

## Rôle de Supabase dans le projet

**Supabase** n’est pas qu’une base : il gère l’**authentification**, stocke les **données métier**, l’**historique des conversations** avec l’assistant, et applique des règles de **sécurité au niveau des lignes** (RLS). Les **accès aux outils** (Airtable, n8n, données Supabase via MCP) sont assurés **côté API** avec des **jetons serveur** / MCP, pas par des jetons par utilisateur stockés en base pour ces intégrations dans la configuration documentée ici.

## Tables principales (d’après les migrations)

Les migrations sont dans `frontend/supabase/migrations/`.

### `profiles`

Profil utilisateur lié à `auth.users` : nom affiché, email, éléments de présentation.

### `leads`

Données de type « lead » avec un statut métier. La table existe côté schéma ; **l’interface actuelle ne met pas cet écran en avant** — à garder en tête si l’on compare schéma SQL et écrans exposés dans l’app.

### `ai_memory`

Mémoire structurée par utilisateur pour l’assistant (selon usage).

### `ai_conversations` et `ai_messages`

Stockage des **conversations** et des **messages** (rôle, contenu, éventuels appels d’outils).

### `ai_action_logs`

Journalisation d’actions liées à l’IA (analyse d’usage, debug).

### `oauth_tokens`

Table prévue pour stocker des **jetons par utilisateur et par fournisseur** (schéma historique / évolutions possibles). **Avec Airtable en MCP server-token**, les accès outil passent par le **jeton serveur** côté API, pas par des lignes utilisateur dans cette table. Elle peut rester pour d’autres usages futurs.

## Sécurité : RLS

La migration `20250213000002_rls.sql` active la **Row Level Security** sur les tables concernées. En résumé : un utilisateur ne voit **que ses lignes** ; conversations et messages **isolés** par propriétaire.

## Profil automatique

Une fonction SQL crée ou met à jour un profil quand un utilisateur apparaît dans `auth.users`.

## Pourquoi Supabase ici ?

Auth + PostgreSQL + politiques de sécurité sans monter une stack serveur de base à la main. Ça laisse du temps pour l’**orchestration** et le **MCP**.

## Points de vigilance

Tenir la **doc** à jour quand les migrations changent ; ne pas contourner la RLS sans bonne raison.

## Interface « Supabase SQL » (app)

L’écran **`/app/supabase`** permet de générer et exécuter du **SQL en lecture** via l’API (MCP Supabase côté backend). L’UI est décrite avec le reste du front dans [`07-frontend.md`](07-frontend.md) (scroll dans les cartes, layout dédié).

## Fichiers de référence

- `frontend/supabase/migrations/20250213000001_schema_initial.sql`
- `frontend/supabase/migrations/20250213000002_rls.sql`
- `frontend/supabase/migrations/20250213100000_oauth_tokens.sql`
- `backend-nest/src/lib/supabase.ts`
- `frontend/src/app/app/supabase/page.tsx`
- `frontend/src/app/app/supabase/layout.tsx`

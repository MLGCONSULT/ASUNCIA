# 03 - BDD Supabase

## Role de Supabase dans le projet

`Supabase` est une brique centrale du projet. Il ne sert pas uniquement a stocker des donnees :

- il gere l'authentification
- il stocke les informations metier
- il conserve l'historique de conversation IA
- il conserve les tokens OAuth utilisateur
- il applique des regles de securite via la `RLS`

## Tables principales

D'apres les migrations presentes dans `frontend/supabase/migrations/`, les tables les plus importantes sont les suivantes.

### `profiles`

Cette table contient les informations du profil utilisateur. Elle est liee a `auth.users`.

Usage principal :

- nom d'affichage
- email
- informations de presentation

### `leads`

Cette table represente des leads avec un statut metier. Elle montre que le projet garde une dimension CRM, meme si l'interface actuelle met davantage en avant les integrations et l'IA.

### `ai_memory`

Cette table permet de stocker une memoire structuree par utilisateur. Elle peut servir a memoriser des informations utiles au comportement de l'assistant.

### `ai_conversations`

Cette table stocke les conversations entre l'utilisateur et l'assistant.

### `ai_messages`

Cette table stocke les messages d'une conversation :

- role
- contenu
- eventuels appels d'outils

### `ai_action_logs`

Cette table journalise des actions liees a l'IA. Elle peut etre utile pour analyser l'usage, verifier ce qui a ete demande ou faciliter le debug.

### `oauth_tokens`

Cette table stocke les tokens OAuth par utilisateur et par provider. Elle est essentielle pour `Gmail`, `Notion` et `Airtable` en mode OAuth utilisateur.

## RLS et securite

La migration `20250213000002_rls.sql` active la `Row Level Security` sur les tables principales. Le principe est simple :

- un utilisateur ne voit que ses propres donnees
- les conversations sont isolees par utilisateur
- les messages sont accessibles via la conversation du bon proprietaire
- les tokens OAuth sont eux aussi proteges par utilisateur

Ce point est important dans un projet d'alternance, car il montre une vraie attention a l'isolation des donnees.

## Trigger utile

Une fonction SQL cree ou met a jour automatiquement un profil lors de la creation ou mise a jour d'un utilisateur dans `auth.users`.

Ce mecanisme evite d'avoir a creer le profil a la main dans le code applicatif.

## Pourquoi Supabase est un bon choix ici

Dans ce projet, `Supabase` simplifie plusieurs sujets a la fois :

- auth
- base de donnees
- politiques de securite
- rapidite de mise en place
- bonne compatibilite avec un frontend moderne

Cela permet de se concentrer davantage sur la logique d'orchestration et l'IA.

## Limites et vigilance

Il faut rester attentif a plusieurs points :

- garder la doc synchronisee avec les migrations
- ne pas contourner la RLS sans raison
- bien gerer les tokens OAuth et leur rafraichissement
- garder une separation claire entre auth utilisateur et auth des integrations

## Fichiers de reference

- `frontend/supabase/migrations/20250213000001_schema_initial.sql`
- `frontend/supabase/migrations/20250213000002_rls.sql`
- `frontend/supabase/migrations/20250213100000_oauth_tokens.sql`
- `backend/src/lib/supabase.ts`

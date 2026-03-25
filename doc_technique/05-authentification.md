# 05 - Authentification

## Idee generale

Le projet utilise plusieurs niveaux d'authentification. Il est important de bien les distinguer.

### Niveau 1 - Authentification applicative

L'utilisateur se connecte a l'application via `Supabase Auth`.

Le frontend recupere ensuite la session et transmet le `JWT` au backend NestJS dans le header `Authorization: Bearer <token>`.

Le backend verifie ensuite ce token avant d'autoriser l'acces aux routes protegees.

### Niveau 2 - Authentification des integrations

Certaines integrations ont leur propre logique d'acces :

- `Airtable` via OAuth utilisateur ou token serveur
- `n8n` via token serveur

Cette separation est essentielle. Un utilisateur peut etre connecte a l'application sans pour autant avoir connecte tous les outils externes.

## Flux applicatif principal

1. L'utilisateur se connecte sur le frontend.
2. `Supabase` cree la session.
3. Le frontend envoie le `JWT` au backend.
4. Le backend verifie le token.
5. Les routes protegees deviennent accessibles.

## Flux OAuth (Airtable)

Le flux OAuth pour **Airtable** est gere par le backend NestJS, avec stockage des tokens dans `oauth_tokens` lorsque le mode utilisateur est actif.

Les etats temporaires du flux ne reposent plus uniquement sur la memoire du processus. Ils sont persistes, ce qui rend le comportement plus fiable en environnement serverless.

## Pourquoi c'est un point important

Ce mecanisme montre que le projet ne se contente pas d'un simple login. Il gere :

- une authentification applicative
- des permissions utilisateur
- des connexions a des services externes (selon le périmètre actuel)
- la persistance et le rafraichissement de tokens
- la persistance temporaire de l'etat OAuth quand une redirection externe est en cours

## Bonnes pratiques a conserver

- ne jamais exposer les secrets OAuth cote navigateur
- garder le backend comme point de controle
- documenter clairement les modes `oauth` et `server-token` pour Airtable
- verifier que chaque nouvelle integration respecte la meme logique de securite

## Fichiers de reference

- `frontend/src/lib/supabase/`
- `frontend/src/lib/api.ts`
- `backend-nest/src/middleware/auth-user.ts`
- `backend-nest/src/auth/airtable-auth.controller.ts`
- `backend-nest/src/services/oauth-state.ts`
- `backend-nest/src/services/oauth-tokens.ts`

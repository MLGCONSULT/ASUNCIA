# 05 - Authentification

## Idee generale

Le projet utilise plusieurs niveaux d'authentification. Il est important de bien les distinguer.

### Niveau 1 - Authentification applicative

L'utilisateur se connecte a l'application via `Supabase Auth`.

Le frontend recupere ensuite la session et transmet le `JWT` au backend dans le header `Authorization: Bearer <token>`.

Le backend verifie ensuite ce token avant d'autoriser l'acces aux routes protegees.

### Niveau 2 - Authentification des integrations

Certaines integrations ont leur propre logique d'acces :

- `Gmail` via OAuth utilisateur
- `Notion` via OAuth utilisateur ou token serveur
- `Airtable` via OAuth utilisateur ou token serveur
- `n8n` via token serveur

Cette separation est essentielle. Un utilisateur peut etre connecte a l'application sans pour autant avoir connecte tous les outils externes.

## Flux applicatif principal

1. L'utilisateur se connecte sur le frontend.
2. `Supabase` cree la session.
3. Le frontend envoie le `JWT` au backend.
4. Le backend verifie le token.
5. Les routes protegees deviennent accessibles.

## Flux OAuth

Le projet gere ensuite des flux OAuth pour certains providers.

### Gmail

Le demarrage du flux se fait cote frontend, puis les tokens sont stockes dans `oauth_tokens`.

Le point important ici est que le frontend Next.js ne porte pas la logique metier Gmail, mais il heberge bien le point d'entree OAuth et le callback web. Cela explique pourquoi `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` doivent etre coherents a la fois cote frontend serveur et cote backend.

Le mode retenu est `lecture + envoi`, pour rester aligne avec les outils MCP exposes.

### Notion

Le flux est gere principalement par le backend avec redirection, callback et stockage des tokens.

Les etats temporaires du flux ne reposent plus uniquement sur la memoire du processus. Ils sont persistes, ce qui rend le comportement plus fiable en environnement serverless.

### Airtable

Le flux est egalement gere par le backend, avec stockage dans `oauth_tokens`.

Comme pour Notion, les etats temporaires de securite du flux OAuth sont persistes pour eviter les erreurs apres redemarrage ou redeploiement.

## Pourquoi c'est un point important

Ce mecanisme montre que le projet ne se contente pas d'un simple login. Il gere :

- une authentification applicative
- des permissions utilisateur
- des connexions a des services externes
- la persistance et le rafraichissement de tokens
- la persistance temporaire de l'etat OAuth quand une redirection externe est en cours

## Bonnes pratiques a conserver

- ne jamais exposer les secrets OAuth cote frontend
- ne jamais exposer les secrets OAuth cote navigateur
- garder le backend comme point de controle
- documenter clairement les modes `oauth` et `server-token`
- verifier que chaque nouvelle integration respecte la meme logique de securite

## Fichiers de reference

- `frontend/src/lib/supabase/`
- `frontend/src/lib/api.ts`
- `backend/src/middleware/auth.ts`
- `backend/src/routes/auth-notion.ts`
- `backend/src/routes/auth-airtable.ts`
- `frontend/src/app/api/auth/gmail/route.ts`
- `frontend/src/app/api/auth/gmail/callback/route.ts`
- `backend/src/services/oauth-state.ts`

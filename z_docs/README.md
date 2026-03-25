# z_docs

Ce dossier a un role simple : expliquer le projet avec des mots humains, sans perdre le lien avec le vrai code.

Il a ete pense pour un projet d'alternance. L'objectif n'est pas seulement de documenter "ce qui existe", mais aussi de rendre le projet presentable, defendable et maintenable dans le temps.

## A quoi sert ce dossier

- expliquer le sujet et sa valeur
- justifier les choix techniques
- garder une trace claire de l'architecture
- aider a maintenir le projet quand le code evolue
- cadrer les refontes UX pour que l'IA reste au centre

## Contraintes fondatrices du projet

Ces points doivent rester vrais, même si le code évolue :

- l'application s'appuie sur **Supabase** pour la base de données et l'authentification
- le **backend** orchestre les intégrations et reste la couche centrale
- l'interface met en avant les intégrations **Airtable**, **n8n**, **Supabase** et l'**assistant IA**
- l'**IA** reste au cœur de l'expérience utilisateur

## Documentation courte (jury / déploiement)

- **`DOC_TECHNIQUE.md`** — URLs de production, health checks, périmètre de l’interface (à lire en premier pour une mise en prod ou une soutenance).

## Ordre de lecture conseille

1. `DOC_TECHNIQUE.md` — **référence actuelle** (URLs, santé API)
2. `01-projet-et-justification.md`
2. `02-architecture-globale.md`
3. `03-bdd-supabase.md`
4. `04-mcp-et-integrations.md`
5. `05-authentification.md`
6. `06-backend.md`
7. `07-frontend.md`
8. `08-ui-ux-et-ia-au-coeur.md`
9. `09-web-scraping-optionnel.md`
10. `10-feuille-de-route.md`
11. `12-regles-de-maintenance-doc.md`
12. `13-checklist-validation-mcp.md`
13. `14-guide-configuration-mcp.md` — **Pour configurer simplement les MCP** (variables, ordre, vérifications)

## Source de verite

`z_docs` n'a pas vocation a remplacer le code. Les verites techniques prioritaires restent :

- `README.md` (racine)
- `DOC_TECHNIQUE.md`
- `backend-nest/.env.example` et `backend/docs/MCP.md` (selon le backend déployé)
- `backend/.env.example`
- `backend/docs/MCP.md`
- `backend/src/config/mcp.ts`
- `backend/src/routes/`
- `backend/src/services/oauth-state.ts`
- `backend/src/validators/schemas.ts`
- `frontend/src/lib/api.ts`
- `frontend/src/lib/supabase/`
- `frontend/supabase/migrations/`

Quand un doute apparait entre une phrase de documentation et le code, c'est le code qui prime. La documentation doit alors etre corrigee.

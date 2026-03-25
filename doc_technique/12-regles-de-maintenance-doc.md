# 12 — Faire vivre cette documentation

## Pourquoi ce fichier existe

Une doc utile **vieillit** avec le code. Ce court texte fixe des **règles simples** pour que `doc_technique/` reste **fiable** quand le dépôt change.

## Règle d’or

Quand vous modifiez **sérieusement** le comportement du produit (auth, MCP, écrans, base), mettez à jour **dans le même lot de travail** le ou les fichiers `doc_technique/` concernés.

## Quel fichier toucher selon le sujet

| Changement | Fichier typique |
|------------|-----------------|
| Architecture | `02-architecture-globale.md` |
| Base / Supabase | `03-bdd-supabase.md` |
| MCP / intégrations | `04-mcp-et-integrations.md` |
| Auth / session | `05-authentification.md` |
| Backend | `06-backend.md` |
| Front / navigation | `07-frontend.md` |
| UX / IA | `08-ui-ux-et-ia-au-coeur.md` |
| Priorités produit | `10-feuille-de-route.md` |
| Recette avant démo | `13-checklist-validation-mcp.md` |

## Rédaction

Phrases **courtes**, **jargon** seulement si utile, **séparer** le pourquoi du comment. Si une phrase ne correspond plus au code, **corrigez-la** — pas seulement au prochain sprint.

## Après une grosse modification

Relire au moins **`DOC_TECHNIQUE.md`** et le chapitre touché. Si un lecteur externe ne comprendrait plus le projet, la doc n’a pas fini son travail.

# 08 — Interface, parcours et place de l’IA

## Point de départ

L’app a longtemps ressemblé à une **suite de pages** : accueil, dashboard avec cartes, vues séparées pour Airtable, Supabase, n8n, chatbot. Propre, mais parfois **froide** : on voyait un **catalogue d’outils** plus qu’un fil conducteur.

## Ce que l’utilisateur doit comprendre vite

À l’arrivée dans l’app : **ce qu’il peut faire**, **pourquoi l’IA aide**, **où regarder en premier**, **quels outils sont connectés**. Si ce n’est pas clair en quelques secondes, la valeur du projet se dilue.

## Direction prise

Donner au dashboard un rôle de **« centre de contrôle »** : intentions visibles, pas seulement des liens. L’**assistant** est un **point d’entrée naturel**, pas une petite fenêtre cachée. Les **états de connexion** aux outils doivent être **compréhensibles** sans lire la doc technique.

## Refonte : ce qui a été visé

Accueil plus **lisible** sur la promesse, **compact** sur desktop, visuellement un peu **moins rigide** qu’un simple empilement de cartes. Dashboard plus **guidé**, navigation **plus claire**, **raccourcis** vers l’assistant depuis les pages métier quand ça a du sens.

## Principes à garder

Commencer par une **intention**, pas par le nom d’un outil. Les actions IA **visibles** mais pas envahissantes. Les pages **utilisables** même sans être expert en automatisation. La navigation doit **aider**, pas seulement décorer.

## Produit visé

Un **assistant opérationnel** : reformuler une demande, mobiliser les bonnes intégrations, proposer une suite d’étapes, et **renvoyer** vers le bon écran si l’utilisateur veut aller plus loin.

## Piège à éviter

Réduire l’IA à **un widget de chat** dans un coin. Ici, elle doit **structurer** l’expérience (parcours, liens, intentions), pas seulement **habiller** une page.

## Fichiers de référence

- `frontend/src/app/page.tsx`
- `frontend/src/app/app/dashboard/page.tsx`
- `frontend/src/components/ChatAssistant.tsx`
- `frontend/src/components/ToolCards.tsx`
- `frontend/src/components/NavWheel.tsx`
- `frontend/src/components/CommandPalette.tsx`

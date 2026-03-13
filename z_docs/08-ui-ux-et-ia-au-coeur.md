# 08 - UI, UX et IA au coeur

## Diagnostic

L'application avait initialement une presentation assez classique :

- une page d'accueil minimaliste
- un dashboard avec un chat et des cartes
- des vues outils separees pour `Gmail`, `Airtable`, `Notion` et `n8n`

Cette base etait propre, mais elle donnait parfois l'impression d'une collection de modules plus que d'un assistant central.

## Probleme principal

Quand l'utilisateur entre dans l'application, il doit comprendre tres vite :

- ce qu'il peut faire
- pourquoi l'IA est utile
- ou trouver l'information prioritaire
- quelles sources sont connectees

Si cette lecture n'est pas immediate, le projet perd une partie de sa valeur percue.

## Direction retenue

La direction UX retenue dans ce projet est la suivante :

- faire du dashboard une `mission control`
- faire de l'IA un point d'entree naturel
- montrer l'etat des integrations
- proposer des intentions concretes plutot qu'une simple navigation
- enrichir chaque vue outil avec des actions IA contextuelles

## Ce qui a ete vise dans la refonte

- un accueil public plus clair sur la promesse du produit
- un accueil public compact, lisible et sans scroll sur desktop
- un accueil moins rectangulaire, plus organique et plus premium
- un dashboard plus guide
- des cartes d'outils plus utiles
- une navigation plus lisible
- une palette de commande plus orientee action
- des raccourcis vers l'assistant depuis les pages metier

## Principes UX a garder

- l'utilisateur doit pouvoir commencer par une intention, pas par une page technique
- les connexions etats outils doivent etre compréhensibles
- les actions IA doivent etre visibles sans devenir envahissantes
- les pages metier doivent rester exploitables meme sans expertise technique
- la navigation doit aider, pas seulement decorer
- l'accueil doit tenir dans le viewport sur desktop autant que possible
- l'accueil doit donner une impression plus vivante qu'un simple tableau de bord a cartes

## Idee produit cible

Le projet doit se comporter comme un assistant operationnel :

- il comprend une demande
- il mobilise les bonnes integrations
- il aide a prendre une decision
- il peut ensuite guider vers la bonne vue si l'utilisateur veut aller plus loin

Sur l'accueil, cela se traduit par une direction visuelle plus `organique premium` :

- des volumes moins rigides
- une hierarchie plus editoriale
- un apercu produit plus immersif
- des CTA plus evidents et plus desirables

## Risque a eviter

Le principal risque serait de retomber dans une logique ou l'IA est seulement un widget de chat. Ce projet doit continuer a montrer que l'IA structure l'experience, pas seulement l'habille.

## Fichiers de reference

- `frontend/src/app/page.tsx`
- `frontend/src/app/app/dashboard/page.tsx`
- `frontend/src/components/ChatAssistant.tsx`
- `frontend/src/components/ToolCards.tsx`
- `frontend/src/components/NavWheel.tsx`
- `frontend/src/components/CommandPalette.tsx`

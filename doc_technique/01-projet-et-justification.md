# 01 — Projet et justification

## De quoi s’agit-il ?

AsuncIA est une **application métier** où l’utilisateur ne se contente pas de consulter des données : il peut parler à un **assistant** qui l’aide à s’orienter, à comprendre un contexte et à agir dans des **outils déjà branchés** (Airtable, n8n, Supabase, etc.). Un **chatbot de recommandation** (Stacky / Typebot) et un **assistant** complètent la navigation classique.

## Le problème qu’on cherche à attaquer

Dans beaucoup de contextes pro, l’info est **éclatée** entre plusieurs services. La difficulté n’est pas seulement de stocker des données, mais de savoir **par où commencer**, **quoi faire en priorité**, et **comment éviter les tâches répétitives** sans changer d’outil toutes les deux minutes.

L’IA n’est pas là pour faire joli : elle joue le rôle d’**aide à l’orchestration** — proposer une suite d’actions possibles et renvoyer vers le bon écran quand c’est pertinent.

## Pourquoi ce sujet tient la route en alternance

Le projet touche à la fois :

- à une **architecture web** actuelle (front + API + base) ;
- à l’**authentification** et à la **persistance** des données ;
- au **branchement d’outils externes** via **MCP** (jetons serveur) ;
- à la **réflexion produit** (parcours, clarté) ;
- à la **documentation** et à la capacité à **expliquer** ce qui a été fait.

Ce n’est pas seulement une démo de code : c’est un **système qu’on peut expliquer** à quelqu’un qui n’est pas dans le détail du repo.

## Ce que l’utilisateur gagne

Au lieu de jongler à la main entre Airtable, n8n et Supabase, il peut :

- **formuler** une intention (par exemple : « je veux automatiser une tâche ») ;
- **s’appuyer** sur l’assistant pour structurer la réponse ou le chemin ;
- **passer** à l’outil concerné quand il est prêt.

## En quoi cette valeur se résume-t-elle ?

- Une **expérience unique** qui regroupe plusieurs sources utiles.
- Des **intégrations actionnables** depuis une interface lisible.
- L’**assistant** comme fil conducteur, pas comme gadget isolé.
- Une **base de code** assez claire pour évoluer sans tout reprendre à zéro.

## À qui ça peut parler ?

À toute personne qui **cumule plusieurs outils** au quotidien : commercial, opérationnel, chef de projet, indépendant, petite structure. Le dénominateur commun : **gagner du temps** pour retrouver l’info utile et lancer une action sans se perdre.

## Où se situe le produit ?

Ni un simple tableau de bord, ni une chatbox coupée du reste. Plutôt un **espace de travail** où l’IA et les outils métier sont **au même endroit**, avec une architecture qui laisse la porte ouverte à de nouvelles intégrations si le besoin métier le justifie.

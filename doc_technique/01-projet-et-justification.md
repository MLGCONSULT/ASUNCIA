# 01 - Projet et justification

## Le sujet

Ce projet vise a construire une application metier assistee par l'IA. L'utilisateur ne manipule pas seulement des donnees : il peut dialoguer avec un assistant qui l'aide a comprendre une situation, retrouver le bon contexte et agir dans des outils connectes.

L'application relie plusieurs briques utiles au quotidien :

- `Airtable` pour les donnees structurees
- `n8n` pour les automatisations
- `Supabase` pour l'authentification, la base de donnees et certaines operations MCP
- un chatbot de recommandation (Stacky / Typebot) et un assistant IA integre

## Pourquoi ce sujet est pertinent

Dans beaucoup d'environnements professionnels, l'information est eparpillee entre plusieurs outils. Le vrai probleme n'est pas seulement de stocker des donnees, mais de savoir :

- ou regarder en premier
- quoi traiter en priorite
- comment eviter les taches repetitives
- comment garder une vue coherente de son activite

L'IA prend donc ici une place utile : elle sert de couche d'orchestration et d'assistance, pas seulement de gadget conversationnel.

## Pourquoi ce sujet a du sens en alternance

Ce projet est interessant dans un cadre d'alternance parce qu'il montre plusieurs competences a la fois :

- conception d'une architecture web moderne
- integration d'authentification et de base de donnees
- connexion a des outils externes via MCP et OAuth
- refactorisation et maintien de la qualite technique
- reflexion produit et experience utilisateur
- documentation et capacite a justifier des choix

Autrement dit, ce projet ne montre pas uniquement la capacite a coder. Il montre aussi la capacite a structurer, expliquer et faire evoluer une application realiste.

## Le probleme que le projet cherche a resoudre

Le projet cherche a reduire la friction entre l'intention de l'utilisateur et l'action technique. Au lieu de passer manuellement d'un outil a l'autre, l'utilisateur peut demander :

- une analyse de ses donnees (Airtable, Supabase)
- un controle ou une execution de workflow n8n
- une orientation vers le bon ecran ou la bonne demarche

L'idee centrale est donc la suivante : l'utilisateur exprime un besoin, puis le systeme l'aide a comprendre et a agir.

## La valeur du projet

La valeur du projet repose sur quatre points :

- centraliser plusieurs sources d'information dans une meme experience
- rendre les integrations actionnables via une interface simple
- remettre l'IA au centre comme copilote
- garder une architecture suffisamment propre pour evoluer dans le temps

## Public cible

Le projet peut convenir a un utilisateur qui a besoin de jongler entre plusieurs outils numeriques :

- un profil commercial
- un profil operationnel
- un profil gestion de projet
- un independant ou une petite structure qui veut gagner du temps

Le point commun est le besoin de retrouver rapidement l'information utile et de declencher des actions sans se perdre dans une interface trop technique.

## Positionnement

Ce projet n'est pas un simple tableau de bord. Ce n'est pas non plus une boite de chat isolee. Il se situe entre les deux :

- un espace de travail oriente action
- une interface guidee par l'IA
- une architecture ouverte sur les integrations metier

## Ce que le projet doit continuer a respecter

Pour rester coherent avec son sujet, le projet doit toujours conserver :

- une IA visible et utile
- une architecture orientee orchestration
- des integrations MCP fonctionnelles
- une logique de maintenabilite, pas seulement de demonstration

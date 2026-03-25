# 07 - Frontend

## Role du frontend

Le frontend sert a rendre le projet concret, utilisable et lisible. Il affiche l'interface, recupere la session utilisateur et dialogue avec le backend.

Son role n'est pas de porter toute la logique metier. Cette logique reste volontairement concentree dans le backend.

## Ce que gere le frontend

- l'accueil public
- la connexion et l'inscription
- la zone protegee de l'application
- la navigation
- les pages metier
- certains points de passage OAuth cote web, notamment Gmail

L'accueil public a ete compacte pour mieux tenir sur un ecran desktop sans scroll, tout en gardant les codes visuels du projet. C'est important car la premiere impression du produit doit etre plus immediate et plus moderne.

## Communication avec le backend

Le frontend utilise un client dedie pour appeler l'API backend. Ce client ajoute le JWT Supabase dans les headers quand c'est necessaire.

Cela permet de garder une frontiere claire :

- le frontend demande
- le backend decide et execute

## Pages principales

Les pages importantes du frontend sont :

- un accueil public
- un dashboard
- une vue `Mails`
- une vue `Airtable`
- une vue `Notion`
- une vue `n8n`

Le point fort du projet est que ces pages ne sont pas isolees. Elles sont progressivement repensees pour fonctionner comme un ensemble pilote par l'IA.

La home publique joue maintenant un vrai role produit :

- elle montre la promesse principale
- elle affiche les integrations clefs
- elle indique le parcours conseille pour demarrer

## Navigation

La navigation doit rester simple. Si elle devient trop orientee technique, l'utilisateur voit surtout une collection d'outils. Si elle est mieux pensee, il voit un assistant qui l'aide a atteindre un objectif.

## Enjeu UX

Le frontend porte une grande partie de la perception du projet. C'est donc ici que l'on doit faire apparaitre :

- la promesse IA
- les connexions actives
- les actions utiles
- la priorisation

## Ce qu'il faut conserver

- une interface lisible
- une communication propre avec le backend
- une bonne separation entre affichage et logique metier
- une UX centre sur l'intention utilisateur
- une home compacte et lisible sur laptop

## Fichiers de reference

- `frontend/src/app/`
- `frontend/src/app/page.tsx`
- `frontend/src/components/`
- `frontend/src/lib/api.ts`
- `frontend/src/lib/supabase/`

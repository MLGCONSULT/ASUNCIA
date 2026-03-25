# 12 - Regles de maintenance documentaire

## Pourquoi cette page existe

Une documentation utile n'est pas une documentation ecrite une seule fois. Elle doit evoluer avec le projet.

Le but de cette page est de poser des regles simples pour que `doc_technique` reste fiable meme quand le code change.

## Regle principale

Chaque modification significative du code doit entrainer la mise a jour du ou des fichiers `doc_technique` concernes dans le meme lot de travail.

## Regles de mise a jour

- si l'architecture change, mettre a jour `02-architecture-globale.md`
- si la base de donnees ou la logique Supabase change, mettre a jour `03-bdd-supabase.md`
- si une integration MCP change, mettre a jour `04-mcp-et-integrations.md`
- si l'auth ou OAuth change, mettre a jour `05-authentification.md`
- si le role du backend evolue, mettre a jour `06-backend.md`
- si le frontend, la navigation ou les vues changent, mettre a jour `07-frontend.md`
- si l'UX ou la place de l'IA evolue, mettre a jour `08-ui-ux-et-ia-au-coeur.md`
- si la priorite produit change, mettre a jour `10-feuille-de-route.md`
- si une recette de validation change, mettre a jour `13-checklist-validation-mcp.md`

## Regles de redaction

- ecrire de facon claire et bienveillante
- privilegier le sens avant le jargon
- separer le pourquoi, le comment et les limites
- ne pas dupliquer inutilement le code ou les README
- citer les fichiers de reference quand c'est utile

## Regles de coherence

- si une phrase n'est plus vraie dans le code, elle doit etre corrigee
- si une fonctionnalite est experimentale, elle doit etre presentee comme telle
- si une partie est optionnelle, cela doit etre explicite
- si un choix change, la justification doit changer aussi
- si un mode runtime `oauth` ou `server-token` change, il doit etre documente explicitement

## Contraintes a proteger dans le temps

Les futures modifications ne doivent pas casser sans decision explicite :

- la connexion MCP `n8n`
- la connexion MCP `Supabase`
- les automatisations MCP comme `Airtable`, `n8n`, `Supabase`
- le role central du backend
- la place centrale de l'IA dans l'experience utilisateur
- la recette de validation reelle des MCP avant mise en demonstration ou en production

## Verification simple apres modification

Apres une modification importante, se poser ces questions :

- est-ce que `doc_technique` raconte encore la verite ?
- est-ce qu'un lecteur externe comprendrait toujours le projet ?
- est-ce que les contraintes fondatrices sont toujours respectees ?

Si la reponse est non, il faut mettre la documentation a jour avant de considerer le travail termine.

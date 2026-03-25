# 09 - Web scraping optionnel

## Pourquoi cette partie est optionnelle

Le coeur du projet repose deja sur :

- l'IA
- `Supabase`
- les integrations MCP
- l'orchestration backend

Le `web scraping` peut enrichir certains usages, mais il n'est pas indispensable pour que le sujet reste pertinent.

## Quand cela peut avoir du sens

Le scraping peut etre interessant si l'application doit :

- recuperer des informations publiques
- enrichir un contexte
- preparer une veille ou une recherche
- alimenter ensuite l'assistant avec des donnees externes

## Points de vigilance

Le scraping ne doit jamais etre ajoute sans cadre, car il pose plusieurs questions :

- legalite selon les sites cibles
- frequence des requetes
- robustesse des parseurs
- maintenance a long terme
- risque de complexifier inutilement le projet

## Recommandation

Si cette fonctionnalite est retenue plus tard, elle doit rester :

- clairement identifiee comme optionnelle
- isolee dans une couche backend dediee
- documentee techniquement et juridiquement
- separee des integrations MCP existantes

## Bonne approche pour le projet

Dans le cadre d'une alternance, le plus pertinent est de justifier que le scraping n'est ajoute que s'il repond a un vrai cas d'usage, et non pour multiplier artificiellement les technologies.

## Si cette option est implantee

Il faudra ajouter dans `doc_technique` :

- le cas d'usage vise
- la source cible
- la frequence d'execution
- la politique de respect du site cible
- la justification technique

# 09 — Web scraping (hors périmètre actuel)

## Situation aujourd’hui

Le cœur du projet repose sur **l’IA**, **Supabase**, les **MCP** et l’**API NestJS**. **Aucun scraping web** n’est implémenté dans l’application telle qu’elle est décrite ici.

## Si on vous interroge sur le scraping

Réponse factuelle : le scraping aurait pu enrichir certains cas (veille, données publiques), mais il **n’a pas été retenu** pour éviter d’ajouter **complexité**, **risques légaux** (conditions d’usage des sites) et **maintenance** sans besoin métier clair.

## Si un jour on l’ajoute

Il faudrait : un **cas d’usage** précis, une **couche serveur** dédiée, une **doc** sur la légalité et la fréquence des requêtes, et le **garder séparé** des flux MCP existants pour ne pas tout mélanger.

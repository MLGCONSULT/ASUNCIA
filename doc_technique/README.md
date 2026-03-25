# Documentation technique — guide de lecture

Ce dossier sert à **expliquer le projet AsuncIA** à toute personne qui n’a pas le code sous les yeux : lecteur externe, encadrant, ou développeur qui reprend le dépôt plus tard. Chaque fichier répond à une question précise ; on peut les lire dans l’ordre ou ouvrir directement le chapitre utile.

Le ton est volontairement **simple** : peu de jargon pour le jargon, et quand un terme technique apparaît, il est là parce qu’il aide à comprendre, pas pour impressionner.

**Pour lancer l’application** (machine locale ou déploiement), le point d’entrée reste le [**README à la racine**](../README.md) du dépôt.

---

## Table des matières

| Fichier | Contenu | Utile quand… |
|--------|---------|----------------|
| [**DOC_TECHNIQUE.md**](DOC_TECHNIQUE.md) | Liens de démo, contrôles de santé de l’API, périmètre de l’interface, variables d’environnement en résumé | Vous voulez **vérifier que tout est en ligne** ou préparer une question sur la prod. |
| [**01-projet-et-justification.md**](01-projet-et-justification.md) | Problème métier, public visé, valeur du produit | Vous cherchez **le « pourquoi »** du projet. |
| [**02-architecture-globale.md**](02-architecture-globale.md) | Frontend, backend NestJS, Supabase, schéma des flux | Vous voulez **la vue d’ensemble technique**. |
| [**03-bdd-supabase.md**](03-bdd-supabase.md) | Rôle de Supabase, tables utiles, sécurité (RLS) | On vous parle **données, auth, confidentialité**. |
| [**04-mcp-et-integrations.md**](04-mcp-et-integrations.md) | Protocole MCP, outils branchés (Airtable, n8n, Supabase) | Vous voulez comprendre **comment les outils externes sont reliés**. |
| [**05-authentification.md**](05-authentification.md) | Session utilisateur (JWT), secrets MCP côté serveur | Le sujet est **connexion et sécurité**. |
| [**06-backend.md**](06-backend.md) | Rôle de l’API NestJS, modules, chat, health checks | Vous détaillez **le serveur**. |
| [**07-frontend.md**](07-frontend.md) | Pages, navigation, lien avec l’API | Vous détaillez **l’interface**. |
| [**08-ui-ux-et-ia-au-coeur.md**](08-ui-ux-et-ia-au-coeur.md) | Expérience utilisateur, place de l’IA | On parle **parcours et conception**. |
| [**09-web-scraping-optionnel.md**](09-web-scraping-optionnel.md) | Hors périmètre actuel ; repères si le sujet est soulevé | Question sur du **scraping** (non implémenté ici). |
| [**10-feuille-de-route.md**](10-feuille-de-route.md) | Pistes d’évolution court / moyen terme | On demande **la suite possible** du projet. |
| [**11-budget-et-couts.md**](11-budget-et-couts.md) | Postes de coût réalistes (Supabase, hébergement, IA) | On aborde le **coût** et la **sobriété** de la stack. |
| [**12-regles-de-maintenance-doc.md**](12-regles-de-maintenance-doc.md) | Comment garder ce dossier aligné avec le code | Utile surtout pour **vous** ou l’équipe qui maintient le repo. |
| [**13-checklist-validation-mcp.md**](13-checklist-validation-mcp.md) | Vérifications avant démo ou mise en prod | Vous préparez une **démonstration** ou un **go live**. |
| [**14-guide-configuration-mcp.md**](14-guide-configuration-mcp.md) | Où mettre quelles variables, dans quel ordre | Vous **configurez** les intégrations MCP. |

---

## Parcours suggéré

**Lecture rapide (environ un quart d’heure)**  
`DOC_TECHNIQUE.md` → `01-projet-et-justification.md` → `02-architecture-globale.md` : liens utiles, sens du projet, schéma technique.

**Lecture ciblée**  
Le tableau ci-dessus indique quel fichier ouvrir selon le sujet — pas besoin de tout lire d’un coup.

**Reprise du projet après une pause**  
Enchaîner `03` à `08`, puis `14` et `13` lors d’un travail sur la configuration ou le déploiement.

---

## Où est le code ?

Les références utiles côté dépôt : `backend-nest/src/` (API NestJS), `frontend/src/` (Next.js), `frontend/supabase/migrations/` (schéma base). En cas de doute entre un texte ici et le code, **faites confiance au code** — et mettez à jour la doc si ça a divergé.

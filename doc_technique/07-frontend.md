# 07 — Frontend

## Rôle

Le **Next.js** rend l’application **visible et utilisable** : pages, navigation, session utilisateur, appels à l’API. La **logique métier lourde** reste volontairement côté serveur.

## Ce que couvre le front

Accueil public, connexion, inscription, zone connectée, **navigation** (dock en bas de l’app), pages **Airtable**, **Supabase**, **n8n**, **chatbot Stacky** (iframe), **dashboard**, **assistant**. Les **appels** vers ces outils passent par l’**API** (MCP côté backend, jetons serveur), pas par une connexion « compte personnel » dans le navigateur pour Airtable.

L’**accueil public** a été resserré pour tenir sur un écran laptop sans scroll excessif, tout en gardant l’identité visuelle du site — première impression compte.

## Dialogue avec l’API

Un **client HTTP** (`frontend/src/lib/api.ts`) ajoute le **JWT** Supabase quand c’est nécessaire. Le front **demande** ; le serveur **décide**.

## Pages principales (aperçu)

Accueil marketing, **dashboard**, vues **Airtable**, **Supabase**, **n8n**, page **Chatbot** (Typebot). L’idée est que ces écrans ne soient pas des **îlots** : l’assistant et les **intentions** (cartes, raccourcis) aident à passer de l’un à l’autre.

### Page Workflows (n8n)

Fichier : `frontend/src/app/app/n8n/N8nView.tsx`.

- **Liste** des workflows via `GET /api/n8n/workflows` (paramètres optionnels côté API : `limit` borné comme le MCP, `query`, `projectId`).
- **Détail** via `GET /api/n8n/workflows/:id` ; **exécution** via `POST .../execute` (corps JSON ; le backend complète les `inputs` MCP si besoin).
- **JSON affiché** — deux vues :
  - **Effectif** (par défaut) : graphe proche d’un **export n8n** (`nodes`, `connections`, `pinData`, `meta`) dérivé surtout de **`activeVersion`** dans la réponse MCP, car la racine `workflow` reflète souvent le **brouillon**.
  - **Réponse MCP** : objet `workflow` brut tel que renvoyé par l’API (scopes, métadonnées, brouillon, etc.).
- **Copier** : copie le contenu de la vue active (effectif ou MCP).
- **Actualiser** : recharge le détail du workflow sélectionné depuis l’API.

## Navigation

Si la navigation ressemble à une **liste de modules techniques**, l’utilisateur ne voit qu’un catalogue d’outils. Si elle est **guidée**, il voit plutôt un **parcours** vers un objectif — c’est le second cas que le projet vise.

### En-tête (`AppHeader`)

- **Logo / marque** (lien vers le dashboard), **indicateur de page** (libellé court sur grands écrans).
- **Barre de recherche** : composant `CommandPalette` en variante `header` — saisie visible, résultats sous le header (pas de liste d’intentions assistant : uniquement les **pages outils**).
- **Déconnexion**.
- Il n’y a **pas** de rangée d’onglets outils dans le header : la navigation principale des modules est le **dock bas**.

### Dock bas (`NavWheel`)

- Cinq entrées, ordre : **Airtable** → **Chatbot** → **Dashboard** (centre, légèrement plus grand) → **Workflows (n8n)** → **Supabase**.
- Rendu **bulles** aligné sur l’orbit du dashboard : classes CSS `dashboard-tool-bubble` + teinte par outil (`dashboard-tool-bubble-fuchsia`, `-stacky`, `-cyan`, `-amber`, `-emerald`).
- **Fil** entre les bulles : segments en dégradé des couleurs voisines ; **intensité / glow** selon l’onglet **survolé** ou **actif** (route courante).
- **Onglet actif** : mise à l’échelle (scale) + halo coloré (RGB partagés avec le fil).

### Configuration partagée (`app-nav-config.ts`)

- Types **AppNavItem** : libellés, icônes (`NavIcon`), classes Tailwind (accents, dock, palette de commandes).
- Exporte notamment `NAV_WHEEL_ITEMS`, `NAV_WHEEL_ORBIT_TONE`, `NAV_WHEEL_WIRE_RGB`, `isAppNavActive`, et les couleurs **palette** (`paletteHover` / `paletteSelected`) pour la recherche.

### Palette de commandes (`CommandPalette`)

- **Header** : barre + liste déroulante ; **variante par défaut** (bouton ⌘K + modale) pour les layouts qui l’utilisent encore (`AppNav`, `AppRail`).
- Raccourci **⌘K** / **Ctrl+K** : ouverture / fermeture ; les lignes non sélectionnées ont un **survol teinté** par outil ; la sélection (clavier ou souris) reprend la même **charte couleur**.

### Layout zone `/app` (`app/app/layout.tsx`)

- Le **cadre glass** du panneau principal est en **`overflow-hidden`** : le contour de l’onglet ne défile pas.
- Le **défilement vertical** a lieu **à l’intérieur** de la zone paddée (`overflow-y-auto`, `overscroll-y-contain`), pour garder header + dock fixes à l’écran.

### Page Supabase SQL (`app/app/supabase/`)

- **`layout.tsx`** : conteneur `flex-1 min-h-0 overflow-hidden` pour emboîter correctement la chaîne flex et éviter que toute la page s’étire sans limite.
- **`page.tsx`** : colonne **éditeur** (formulaires + résultats) dans une carte avec **`overflow-y-auto`** ; colonne **Tables** avec scroll interne ; sur mobile la colonne Tables a une **hauteur max** (~40vh). En **desktop**, le panneau Tables ne doit **pas** utiliser `h-auto` sur la carte : il est **borné** par la hauteur de la ligne (`max-h-full`, `self-stretch`, `min-h-0`) pour ne pas faire grandir tout le layout quand une table est ouverte. Le corps de chaque **`<details>`** (colonnes + bouton) a un **`max-h` + `overflow-y-auto`** pour que les schémas très larges ne fassent pas exploser la carte.

## Fichiers de référence

- `frontend/src/app/`
- `frontend/src/app/page.tsx`
- `frontend/src/app/app/layout.tsx`
- `frontend/src/app/app/supabase/layout.tsx`
- `frontend/src/app/app/supabase/page.tsx`
- `frontend/src/app/app/n8n/N8nView.tsx`
- `frontend/src/components/AppHeader.tsx`
- `frontend/src/components/NavWheel.tsx`
- `frontend/src/components/CommandPalette.tsx`
- `frontend/src/lib/app-nav-config.ts`
- `frontend/src/components/`
- `frontend/src/lib/api.ts`
- `frontend/src/lib/supabase/`

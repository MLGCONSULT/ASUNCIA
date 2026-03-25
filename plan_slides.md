# Plan de présentation — AsuncIA (pour créer le support visuel)

**À qui s’adresse ce document :** à la personne qui conçoit les slides (PowerPoint, Canva, Google Slides, etc.) **sans être développeuse**. Tout est là pour produire un **support clair, élégant et fidèle au projet**, sans jargon inutile.

**Objectif de la présentation :** montrer une **application web réelle**, déjà en ligne, qui **centralise des outils métier** (données, automatisation), un **chatbot de recommandation de stack** (Stacky / Typebot) et un **assistant IA** intégré.

---

## Style visuel recommandé

- **Ambiance** : moderne, sombre avec touches lumineuses (bleu lagon / violet doux), comme l’interface du site.
- **Lisibilité** : titres **grands** (≥ 28 pt), texte **court** (≥ 18 pt sur les puces).
- **Règle d’or** : **1 idée principale par slide**, peu de mots, **captures d’écran** dès que possible.
- **Éviter** : listes de technologies pour le plaisir ; mots « bâtards » non expliqués (MCP, JWT, etc.) — si une slide est technique, la traduire en français simple.

---

## Liens à mettre (à ne pas oublier sur les slides)

| Quoi | Lien |
|------|------|
| **Application (à tester)** | **https://asuncia.vercel.app** |
| **API / backend (preuve que le serveur tourne)** | **https://asuncia-backend.vercel.app** |

**Liens « santé »** (ouvrables dans un navigateur ; réponses JSON) :

| Vérification | URL complète |
|--------------|----------------|
| Présence du backend | `https://asuncia-backend.vercel.app/` |
| Connecteur Supabase | `https://asuncia-backend.vercel.app/api/health/mcp-supabase` |
| Connecteur Airtable | `https://asuncia-backend.vercel.app/api/health/mcp-airtable` |
| Connecteur n8n | `https://asuncia-backend.vercel.app/api/health/mcp-n8n` |

*Note pour l’oral : si une ligne affiche « erreur » ou « non configuré », c’est souvent une **variable d’environnement manquante pour ce service**, pas forcément une panne globale.*

---

## Plan slide par slide (8 à 10 slides)

### Slide 1 — Titre

**Titre proposé :** AsuncIA — un seul espace pour vos outils et l’IA  
**Sous-titre :** Présentation + [date] + [prénom]

**Visuel :** logo + capture du **tableau de bord** ou de la page d’accueil (`asuncia.vercel.app`).

**À dire en une phrase :** « Je vous montre une application **déjà en ligne**, pas une maquette. »

---

### Slide 2 — Le problème

**Idée :** Les équipes jonglent entre **plusieurs outils** (bases de données, fichiers, automatisation) ; on perd du temps à changer de contexte.

**À mettre en 3–4 puces courtes.**

**Visuel :** schéma « avant » : plusieurs boîtes dispersées → « après » : une seule fenêtre (AsuncIA).

---

### Slide 3 — La solution (en une image)

**Idée :** Une **interface unique** qui connecte **Airtable**, **n8n** (workflows), **Supabase** (données), et un **assistant** pour guider l’utilisateur.

**Ne pas mentionner** d’anciennes pistes non présentes dans l’app (ex. messagerie ou écran « Leads »).

**Visuel :** capture des **cartes d’outils** sur le dashboard ou schéma simple avec les 4 noms.

---

### Slide 4 — Comment ça marche (version grand public)

**Texte type :**

1. L’utilisateur se **connecte** (compte sécurisé).
2. Il choisit un **outil** dans le dock du bas (ordre : Airtable → Chatbot → Dashboard → Workflows → Supabase).
3. L’**assistant IA** peut répondre en langage naturel et **orienter** vers le bon écran ; le **chatbot Stacky** propose un **questionnaire** pour suggérer une stack adaptée.

**Visuel :** schéma **Utilisateur → Site web → Serveur → Outils connectés** (4 blocs).

---

### Slide 5 — Démo live (script)

**Ordre suggéré :**

1. Ouvrir **https://asuncia.vercel.app**
2. Montrer le **dashboard**
3. Ouvrir un **outil** (ex. n8n ou Airtable)
4. Ouvrir l’**assistant** (bulle en bas à droite) et poser une question simple (ex. « Comment créer une automatisation ? »)

**Visuel :** mini-captures numérotées 1 à 4.

---

### Slide 6 — L’IA (rôle concret)

**Idée :** L’assistant **guide** et **structure** la réponse (étapes, liens vers les bons onglets), pas seulement du texte générique.

**Visuel :** capture du **chat** avec une question + une réponse structurée.

---

### Slide 7 — Preuve technique

**Titre :** « Le projet est en ligne et vérifiable »

**Contenu :**

- Lien **frontend** : `https://asuncia.vercel.app`
- Lien **backend** : `https://asuncia-backend.vercel.app`
- Lien **santé** (exemple) : `https://asuncia-backend.vercel.app/api/health/mcp-n8n`

**Visuel :** QR code optionnel vers le front + une petite capture du JSON du backend (page racine).

---

### Slide 8 — Documentation & qualité

**Idée :** Une **documentation technique** structurée existe dans le dépôt (`doc_technique/README.md` pour le plan de lecture, `DOC_TECHNIQUE.md` pour la fiche rapide, fiches MCP et architecture) pour **installer**, **configurer** et **tester**.

**Visuel :** icône « doc » + checklist courte (3 cases cochées).

---

### Slide 9 — Roadmap (optionnel)

**Idée court terme :** stabiliser, enrichir l’UX.  
**Idée moyen terme :** aller plus loin sur l’intelligence des parcours métier.

**Visuel :** flèche du temps ou deux colonnes.

---

### Slide 10 — Conclusion

**Puces :**

- Application **utilisable aujourd’hui**
- **Architecture** claire (front + back + services)
- **Documentation** pour reprendre le projet
- **Questions**

**Visuel :** même identité visuelle que la slide 1 + logo.

---

## Liste de captures d’écran à prévoir

| # | Quoi capturer | Conseil pratique |
|---|----------------|------------------|
| 1 | Page d’accueil ou écran **connexion** | Fenêtre navigateur en **paysage**, URL visible en haut si besoin de montrer le domaine ; éviter les infos personnelles (email flouté si besoin). |
| 2 | **Dashboard** | Vue montrant les **cartes d’outils** (mission control) ; cadrer pour que le titre / la zone centrale soit lisible. |
| 3 | **Dock** (navigation bas) | Capture **largeur complète** du bas d’écran pour voir les 5 pastilles : Airtable, Chatbot, Dashboard, Workflows, Supabase. |
| 4 | Un **outil métier** | Par ex. page **Workflows (n8n)** ou **Airtable** avec un contenu représentatif (pas une erreur vide). Alternative : page **Chatbot** avec l’iframe Stacky visible. |
| 5 | **Assistant IA** (bulle) | Panneau ouvert : montrer le **bandeau « Historique »** + **au moins une question et une réponse** (pas un chat vide). |
| 6 | (Option) **Backend santé** | Onglet navigateur sur `…/api/health/mcp-n8n` (ou racine du backend) avec le **JSON** lisible — preuve « technique » pour la slide 7. |

**Réglages utiles :** zoom navigateur 90–100 %, thème sombre cohérent avec les slides, pas de barre de favoris surchargée (ou fenêtre privée).

---

## Checklist avant la présentation

- [ ] Liens `asuncia.vercel.app` et `asuncia-backend.vercel.app` testés le jour J  
- [ ] Compte de démo ou compte personnel prêt pour la connexion  
- [ ] Slides **8–10 max**, pas de murs de texte  
- [ ] **Reprise orale** chronométrée (viser 8–12 min)  
- [ ] Doc technique à jour : `doc_technique/README.md` + `doc_technique/DOC_TECHNIQUE.md`

---

## Fichier technique détaillé

Documentation technique : **`doc_technique/README.md`** (guide de lecture), puis **`doc_technique/DOC_TECHNIQUE.md`** (fiche rapide : URLs, health checks, périmètre).

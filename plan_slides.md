# Plan de slides — AsuncIA

Plan final demandé, avec texte court, ton académique, et emplacements de captures.

---

## Slide 1 — Sommaire

1. Idée du projet  
2. Structure du projet  
3. Exemples de prompt Cursor  
4. Conclusion  
5. QR Code Back + Front pour tests / Vidéo de présentation du projet après  
6. Questions

**Espace visuel :**
`[Capture légère de la page d’accueil en arrière-plan, opacité faible]`

---

## Slide 2 — Idée du projet

**Texte proposé :**

Au départ, l’idée était de créer un assistant central "type Jarvis", capable de superviser l’ensemble des outils.  
En avançant sur le projet, j’ai fait un choix plus réaliste et plus robuste: utiliser l’IA comme guide opérationnel, et construire surtout une interface qui centralise les MCP des outils.

Le résultat: au lieu d’ouvrir plusieurs plateformes séparées, on peut piloter les actions principales depuis une seule application, avec une IA qui oriente les décisions et les étapes.

**Points à afficher :**
- Vision initiale: assistant "Jarvis" qui supervise tout
- Pivot produit: IA guide + exécution via connecteurs MCP
- Centralisation des outils dans une seule interface
- Réduction des allers-retours entre applications différentes

**Screens à mettre :**
- `[SCREEN 1] Dashboard global`
- `[SCREEN 2] Un écran montrant un outil lancé depuis l’interface`

---

## Slide 3 — Structure du projet

**Texte proposé :**

Cette slide explique surtout le fonctionnement réel de l’application, du point de vue utilisateur, puis du point de vue technique.

**Parcours utilisateur (à afficher en premier) :**
Inscription -> Confirmation email (Supabase) -> Connexion -> Accès dashboard -> Utilisation des outils depuis une seule interface

**Ce qu’on peut faire dans l’app (version simple) :**
- Naviguer entre les modules (Airtable, Workflows, Supabase, Chatbot)
- Lancer des actions sans quitter l’application
- Se faire guider par l’assistant pour choisir la bonne action

**Comment les outils sont reliés (focus MCP) :**
- Le frontend envoie les demandes au backend
- Le backend joue le rôle d’orchestrateur
- Les connecteurs MCP servent de pont avec les outils externes
- Résultat: une couche unifiée, au lieu d’appels séparés outil par outil

**Repères à rappeler sur la slide :**
- Frontend: `https://asuncia.vercel.app`
- Backend: `https://asuncia-backend.vercel.app`
- Authentification/confirmation email: Supabase

**Screens à mettre :**
- `[SCREEN 3] Inscription ou connexion`
- `[SCREEN 4] Email de confirmation Supabase (ou écran de confirmation)`
- `[SCREEN 7] Endpoint backend / health (preuve du passage par backend)`

**Espace visuel :**
`[Frise parcours utilisateur en haut]` + `[Schéma MCP simplifié en bas]`

---

## Slide 4 — Exemples de prompt Cursor

**Objectif de la slide :**
Présenter des prompts complets, concrets, et directement réutilisables.

**Ma manière de travailler avec Cursor (à dire en intro de la slide) :**
- Quand le sujet touche plusieurs points, je demande d’abord un plan global (mode plan).
- Je relis ce plan, je le simplifie ou je le réorganise si besoin.
- Ensuite je lance l’exécution étape par étape.
- À la fin, je corrige les erreurs restantes et je refais un passage de vérification.

### Prompt 1 — Frontend (refonte dashboard + hiérarchie visuelle)
```text
Je veux une refonte visuelle du dashboard qui reste dans notre identité actuelle, sans partir dans un redesign total.

Contexte:
- on garde le style cyber/lofi actuel
- on garde les animations principales
- on garde la navigation existante

Objectif:
- améliorer la lisibilité globale du dashboard
- mieux hiérarchiser les cartes importantes
- rendre le dock plus cohérent visuellement avec le contenu de la page

Détails attendus:
- la bulle Dashboard dans la navbar doit rester légèrement plus grande (même inactive)
- retirer les labels visuels inutiles (ex: "Navigation")
- améliorer l’équilibre des cartes (espaces, tailles, priorité visuelle)
- garder un rendu propre desktop + mobile

Avant de coder, passe en mode plan:
1) propose un plan clair en étapes (UI, composants, vérif responsive)
2) je valide / j’ajuste
3) tu exécutes le plan complet
4) tu termines avec vérif lint + typecheck + récap des fichiers modifiés
```

### Prompt 2 — Frontend (expérience utilisateur complète sur la home)
```text
La page d’accueil doit mieux raconter le produit, et être alignée avec nos outils réels.
Aujourd’hui c’est trop “joli” mais pas assez utile.

Je veux:
- une home plus claire sur la valeur du produit
- des accès rapides alignés sur nos vrais modules (Airtable, Chatbot, Dashboard, Workflows, Supabase)
- des CTA qui amènent au bon endroit (connexion + redirection propre)
- un rendu propre et crédible pour une démo orale

Important:
- garde notre ton visuel actuel
- évite les textes bullshit
- garde des blocs simples, lisibles, et orientés usage

Mode plan obligatoire:
1) proposition de structure de page (sections + contenu)
2) validation de ma part
3) implémentation complète
4) vérifications (responsive, liens, cohérence nav)
5) petit résumé final exploitable dans une slide de présentation
```

### Prompt 3 — Backend complet (générateur SQL robuste et utile)
```text
Le créateur de requêtes SQL marche trop souvent en mode "SELECT * LIMIT", et ça bloque les demandes réelles.
Je veux le rendre vraiment utile pour des requêtes custom.

Objectif backend:
- améliorer la génération SQL depuis prompt naturel
- gérer les demandes concrètes utilisateur (tri, filtres, agrégations, périodes)
- garder une sécurité stricte read-only

Exemples à couvrir:
- tri croissant / décroissant sur une colonne demandée
- filtres texte et numériques
- périodes de dates (aujourd’hui, ce mois, 7 derniers jours)
- demandes "combien par statut", "somme par catégorie", etc.

Contraintes:
- pas de requêtes destructives
- pas de multi-statements dangereux
- SQL final lisible et cohérent

Mode plan:
1) plan d’évolution du moteur de parsing
2) validation
3) implémentation backend
4) vérif + exemples de sorties avant/après
```

### Prompt 4 — Backend complet (auth Supabase + redirections prod)
```text
On a un bug critique sur le flux d’inscription:
la confirmation email Supabase redirige mal (localhost/null), donc l’onboarding est cassé.

Contexte prod:
- front: https://asuncia.vercel.app
- back: https://asuncia-backend.vercel.app

Je veux une correction complète, propre, stable:
- signup + resend avec redirection fiable
- callback sécurisé
- gestion des cas redirect vide/null/invalid
- alignement config Supabase + Vercel

Je veux aussi une logique claire:
- origine calculée proprement côté client
- fallback safe côté serveur
- aucune régression sur connexion/inscription

Mode plan obligatoire:
1) plan complet (code + config)
2) je valide / j’ajuste
3) exécution
4) checklist finale de déploiement (variables + URL Supabase à vérifier)
```

**Option visuelle :**
Pas de capture obligatoire sur cette slide.  
Tu peux rester sur une slide texte propre avec les 4 prompts.

---

## Slide 5 — Conclusion

**Texte proposé :**

Le projet est opérationnel en ligne, structuré de manière claire et prêt pour une démonstration technique.  
Les évolutions réalisées montrent une capacité à corriger, améliorer et stabiliser rapidement l’application.

**Option visuelle :**
Pas de capture obligatoire sur cette slide.  
Tu peux garder uniquement le message de conclusion.

---

## Slide 6 — QR Code Back + Front / Vidéo

**Bloc 1 (Front) :**
- `https://asuncia.vercel.app`
- `[QR FRONT]`

**Bloc 2 (Back) :**
- `https://asuncia-backend.vercel.app`
- `[QR BACK]`

**Bloc 3 (Vidéo de présentation) :**
- `[Lien vidéo à ajouter]`
- `[QR VIDEO]`

**Mise en page :**
`[2 colonnes FRONT/BACK]` + `[1 bandeau VIDEO en bas]`

---

## Slide 7 — Questions

**Texte principal :**
Questions ?

**Sous-texte (optionnel) :**
Merci pour votre attention.

**Espace visuel :**
`[Fond sobre + logo AsuncIA]`

---

## Liste des captures à préparer

1. `[SCREEN 1]` Dashboard global  
2. `[SCREEN 2]` Dock navigation (5 bulles)  
3. `[SCREEN 3]` Interface frontend connectée  
4. `[SCREEN 4]` Endpoint backend en ligne (health/JSON)  
5. `[SCREEN 5]` Prompt Cursor complet  
6. `[SCREEN 6]` Diff/patch généré  
7. `[SCREEN 7]` Dashboard final  
8. `[SCREEN 8]` Page outil (Supabase / n8n / Chatbot)  
9. `[QR FRONT]`, `[QR BACK]`, `[QR VIDEO]`

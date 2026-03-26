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

### Prompt 1 — Frontend (petite modif UI)
```text
La bulle Dashboard dans la navbar doit toujours être légèrement plus grande que les autres.
Retire aussi le texte "NAVIGATION" qui n’est pas très beau visuellement.
Fais la modif directement, sans casser les animations existantes.
```

### Prompt 2 — Frontend (mode plan, refonte visible)
```text
Cette carte sert à rien; on devrait la remplacer par une horloge temps réel.
Je veux un rendu plus joli, cohérent avec l’app, et afficher Bonjour/Bonsoir selon l’utilisateur connecté.

Commence en mode plan:
- propose un plan clair en plusieurs étapes
- je le modifie si besoin
- ensuite tu exécutes
- puis tu corriges les erreurs si nécessaire

Je veux garder un style propre et homogène avec le dashboard.
```

### Prompt 3 — Frontend (ajustement fonctionnel)
```text
Le Bonjour/Bonsoir n’est pas adapté à l’heure.
Au lieu du prénom, récupère le nom saisi à l’inscription depuis Supabase, et sinon utilise l’email.
Adapte aussi la page d’accueil en fonction de nos outils effectifs.
```

### Prompt 4 — Auth / Backend + Front (mode plan)
```text
La confirmation Supabase lors de la création du compte ne marche pas:
ça redirige vers localhost + null.

Mon front est sur https://asuncia.vercel.app
et le back sur https://asuncia-backend.vercel.app.

Je veux que tu gères ça proprement avec un plan:
1) plan d’action en mode plan
2) validation / ajustements
3) exécution des modifs (inscription, callback, redirects, config)
4) vérifs finales et points à contrôler côté Supabase/Vercel
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

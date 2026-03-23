# Guide Slides (pour une personne non-tech)

But: aider quelqu'un qui n'est pas du milieu a faire un PowerPoint clair, joli et utile, sans devoir comprendre tout le code.

## Ce qu'il faut livrer le 27 mars

1. Une presentation simple (8 a 10 slides max)
2. Une demo live du projet
3. Un lien de test (si possible) pour que Mickael puisse essayer
4. Une doc technique claire (simple a lire, mais complete)

---

## Regles simples pour faire les slides

- 1 slide = 1 idee
- 4 a 6 points max par slide
- phrases courtes
- beaucoup de captures d'ecran, peu de texte
- style visuel propre, pas surcharge
- police lisible (minimum 24 pour titres, 16 pour texte)

---

## Plan slide par slide (pret a suivre)

### Slide 1 - Titre

**Mettre:**
- AsuncIA - CRM intelligent
- "Presentation live - 27 mars"
- Nom + role

**A dire en oral (simple):**
"Je vais vous montrer un outil deja utilisable, pas un simple prototype."

**Visuel:**
- logo + belle capture de la page d'accueil/dashboard

---

### Slide 2 - Le probleme et la vision

**Mettre:**
- Probleme: trop d'outils separes (emails, CRM, automatisation, bases)
- Vision: tout piloter dans une seule interface
- Benefice: gain de temps + plus simple + meilleure vue globale

**A dire:**
"On veut enlever la dispersion et centraliser le travail."

**Visuel:**
- schema "Avant / Apres"

---

### Slide 3 - Ce qui existe deja

**Mettre (niveau non-tech):**
- Assistant IA integre
- Onglets: Mails, Airtable, Notion, Supabase, n8n
- Auth utilisateur securisee
- Dashboard utile (actions du jour + raccourcis)

**A dire:**
"Le coeur du produit est deja en place et fonctionne."

**Visuel:**
- tableau simple "Fonction / Statut"

---

### Slide 4 - Comment ca marche (version simple)

**Mettre:**
- L'utilisateur agit dans le front (site)
- Le backend fait les traitements
- Les donnees viennent de services connectes (Gmail, Airtable, etc.)

**A dire:**
"L'appli sert de chef d'orchestre entre l'utilisateur et les outils."

**Visuel:**
- diagramme 4 blocs: Utilisateur -> App -> Backend -> Outils externes

---

### Slide 5 - Demo live (script)

**Mettre:**
1. Ouvrir dashboard
2. Ouvrir un onglet (ex: n8n ou Airtable)
3. Faire une action simple
4. Montrer le resultat

**A dire:**
"On montre un cas reel du debut a la fin."

**Visuel:**
- mini captures des 4 etapes

**Important:**
- ajouter le lien de test si dispo (pour Mickael)

---

### Slide 6 - Exemples de prompts Cursor

**Mettre 3 exemples concrets:**
- Prompt 1: migration backend
- Prompt 2: debug integration
- Prompt 3: amelioration UX

**Structure a afficher pour chaque prompt:**
- "Ce qu'on a demande"
- "Ce que ca a produit"
- "Pourquoi c'etait utile"

**A dire:**
"Cursor accelere, mais on garde toujours un controle humain."

---

### Slide 7 - Documentation technique (ce qu'on livre)

**Mettre:**
- installation
- variables d'environnement
- endpoints importants
- tests Postman
- deploiement
- incidents connus + solutions

**A dire:**
"La doc permet a quelqu'un d'autre de reprendre le projet."

**Visuel:**
- checklist "doc complete"

---

### Slide 8 - Risques et solutions

**Mettre:**
- risques: connexions externes, variables d'env, erreurs API
- solutions: health checks, messages clairs, procedures de test

**A dire:**
"Les risques sont connus et traites avec une methode."

---

### Slide 9 - Roadmap

**Mettre:**
- court terme: stabilisation + fiabilite
- moyen terme: UX + IA plus proactive metier

**A dire:**
"On sait deja la suite, ce n'est pas un projet fige."

---

### Slide 10 - Conclusion

**Mettre:**
- vision claire
- demo reelle
- base technique solide
- doc transmissible
- Q&A

**A dire:**
"Le projet est deja utile et evolutif."

---

## Mini guide "doc technique" (a produire en plus)

La doc doit etre en 2 niveaux:

### 1) Version simple (pour lire vite)
- c'est quoi le projet
- comment le lancer
- comment le tester
- comment le deployer

### 2) Version detaillee (annexe)
- toutes les variables d'environnement
- endpoints avec exemples
- procedures Postman completes
- checklists de debug par integration

Objectif: comprenable vite, mais exploitable par un dev.

---

## Liste de verification finale

- [ ] Slides 8-10 max
- [ ] Chaque slide est comprenable sans jargon
- [ ] Captures d'ecran ajoutees
- [ ] Lien de test ajoute (si dispo)
- [ ] Script oral repete (9-10 min)
- [ ] Doc technique simple + detaillee prete


# Plan PowerPoint - Presentation Projet (27 mars)

Objectif: un support visuel SIMPLE pour accompagner une demo live du projet.

---

## Slide 1 - Titre / contexte

- Titre du projet (AsuncIA)
- Sous-titre: "Presentation live - 27 mars"
- Ton nom / role
- 1 phrase de contexte: "Un assistant CRM unifie, propulse par IA + integrations MCP"

Visuel conseille:
- Logo + capture de l'interface principale

Message a faire passer:
- "Je vais montrer un outil deja utilisable, pas seulement un prototype."

---

## Slide 2 - Vision produit

- Probleme vise (fragmentation des outils: CRM, emails, automatisation, bases)
- Vision: "Une seule interface pour piloter l'activite, assistee par IA"
- Valeur metier:
  - gain de temps
  - moins de friction
  - meilleure centralisation

Visuel conseille:
- Schema simple "Avant / Apres" (plusieurs outils -> AsuncIA)

Message a faire passer:
- "La vision est l'alignement produit + usage terrain."

---

## Slide 3 - Ce qui est construit aujourd'hui

- Frontend Next.js (interface utilisateur)
- Backend Nest.js (API metier)
- Auth utilisateur via Supabase (JWT)
- Integrations actives:
  - Supabase (MCP SQL read-only)
  - Airtable
  - Notion
  - Gmail
  - n8n

Visuel conseille:
- Tableau 2 colonnes: "Module" / "Statut"

Message a faire passer:
- "Le socle technique est reel et deja fonctionnel."

---

## Slide 4 - Architecture simple

- Front appelle backend
- Backend orchestre:
  - logique metier
  - auth
  - appels MCP
- Donnees et services externes relies via MCP / OAuth

Visuel conseille:
- Diagramme 5 blocs:
  - Front
  - Backend Nest
  - Supabase
  - MCP (Airtable/Notion/Gmail/n8n)
  - OpenAI

Message a faire passer:
- "Architecture modulaire, deployable, evolutive."

---

## Slide 5 - Demo live: scenario

- Scenario propose (3-5 min):
  1. Connexion utilisateur
  2. Tester une integration (ex: n8n workflows ou Gmail messages)
  3. Editeur SQL: demande en langage naturel -> SQL genere -> execution
  4. Montrer resultat lisible
- Lien de test a partager (si pret)

Visuel conseille:
- Liste numerotee + mini captures

Message a faire passer:
- "On voit la valeur en direct, sur un vrai flux utilisateur."

---

## Slide 6 - Exemples de prompts Cursor utilises

- Prompt 1 (migration backend):
  - "Porte les routes /api/airtable/* en module/controller Nest avec middleware auth JWT."
- Prompt 2 (debug OAuth):
  - "Diagnostique 401 invalid_client Airtable et propose un protocole Postman."
- Prompt 3 (UX):
  - "Rends l'affichage des resultats SQL plus lisible (tableau + fallback)."

Ce qu'il faut expliquer:
- intention du prompt
- resultat obtenu
- gain de productivite

Visuel conseille:
- 3 cartes "Prompt -> Impact"

Message a faire passer:
- "Cursor a accelere l'implementation, mais avec validation humaine."

---

## Slide 7 - Documentation technique (a rendre en plus)

- Contenu minimum de la doc:
  - prerequis et stack
  - variables d'environnement (front/back)
  - procedure de lancement local
  - endpoints principaux
  - procedure de test MCP (Postman)
  - procedure de deploiement Vercel
  - limites connues / points de vigilance

Visuel conseille:
- Checklist "Doc prete"

Message a faire passer:
- "Le projet est transmissible et maintenable."

---

## Slide 8 - Risques / limites / mitigations

- Exemples:
  - OAuth tiers (Airtable/Google/Notion) sensible aux credentials
  - Dependance aux environnements (Vercel vars)
  - Gestion des erreurs et observabilite
- Mitigations:
  - checklist env
  - endpoints health
  - tests Postman standardises
  - logs backend

Visuel conseille:
- Tableau "Risque / Action"

Message a faire passer:
- "Les risques sont identifies et encadres."

---

## Slide 9 - Roadmap courte

- Court terme:
  - stabilisation OAuth Airtable
  - finalisation migration backend unique Nest
- Moyen terme:
  - ameliorations UX
  - meilleure observabilite
  - enrichissement IA orientee metier

Visuel conseille:
- Frise simple "Maintenant / Prochainement"

Message a faire passer:
- "On sait exactement quoi faire ensuite."

---

## Slide 10 - Conclusion / Q&A

- 3 points de conclusion:
  - vision claire
  - demo fonctionnelle
  - base technique solide + doc
- Inviter aux questions
- (Option) afficher lien de test

Visuel conseille:
- Slide epuree avec 3 bullets max

---

## Conseils de forme (important)

- 10 slides max
- 1 idee principale par slide
- peu de texte, police lisible
- captures reelles de ton app
- pas d'animations complexes
- garder 5 min de marge pour Q&A

---

## Trame orale (ultra simple)

- 30s intro (vision)
- 2 min architecture + ce qui est fait
- 4 min demo live
- 2 min prompts Cursor + doc technique
- 1 min roadmap + conclusion

Temps total cible: 9-10 min.


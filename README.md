# AsuncIA — SITE_FORMATION

Application web (**Next.js**) + API (**NestJS** dans `backend-nest/`). L’interface parle au backend avec ton compte **Supabase** (connexion sécurisée).

---

## Ce dont tu as besoin

- **Node.js** 18 ou plus  
- Un projet **Supabase** (auth + base de données)  
- Les variables d’environnement remplies (voir ci-dessous)

---

## Lancer l’app en local

L’idée : faire tourner **l’API** et **l’interface** en même temps, sur deux terminaux.

### 1. Installer les dépendances

À la racine du dépôt (cela installe notamment le **frontend** et le workspace `backend` si présent) :

```bash
npm install
```

Puis, pour l’API NestJS utilisée en production :

```bash
cd backend-nest
npm install
cd ..
```

### 2. Configurer les fichiers d’environnement

- **Frontend** : copie `frontend/.env.example` vers `frontend/.env.local` et remplis au minimum :
  - `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` (tableau de bord Supabase → *Settings* → *API*)
  - `NEXT_PUBLIC_SITE_URL` → en local : `http://localhost:3000`
  - `NEXT_PUBLIC_BACKEND_URL` → en local : `http://localhost:4000` (port par défaut du NestJS)

- **Backend NestJS** : crée un fichier `.env` dans `backend-nest/` en t’appuyant sur les variables documentées dans **`doc_technique/DOC_TECHNIQUE.md`** et **`doc_technique/14-guide-configuration-mcp.md`** (Supabase serveur, `OPENAI_API_KEY` pour le chat, MCP selon les outils que tu actives).

Sans Supabase et sans URL de backend correcte, l’app ne pourra pas se connecter ni appeler l’API.

### 3. Démarrer le backend, puis le frontend

**Terminal 1 — API (port 4000 par défaut)** :

```bash
cd backend-nest
npm run start:dev
```

**Terminal 2 — interface** :

```bash
cd frontend
npm run dev
```

Ouvre **http://localhost:3000** dans le navigateur. Si quelque chose bloque, vérifie les messages dans les deux terminaux et que `NEXT_PUBLIC_BACKEND_URL` correspond bien à l’URL où tourne l’API.

---

## Mettre en production (résumé)

En pratique, on déploie souvent **deux projets** (par ex. sur **Vercel**) :

1. **Frontend** : racine du build = dossier `frontend`, avec les variables `NEXT_PUBLIC_*` pointant vers ton Supabase et vers l’**URL publique** du backend.  
2. **Backend** : racine = `backend-nest`, avec les secrets (IA, MCP, clés Supabase *service role*, etc.) uniquement côté serveur.

Les **URLs de démonstration**, les **endpoints de santé** (`/api/health/...`) et le détail des variables sont dans **`doc_technique/DOC_TECHNIQUE.md`**.

---

## Autres documents utiles

| Document | Rôle |
|----------|------|
| [`doc_technique/DOC_TECHNIQUE.md`](doc_technique/DOC_TECHNIQUE.md) | Référence technique (prod, health checks, périmètre) |
| [`doc_technique/`](doc_technique/) | Dossier détaillé (architecture, MCP, auth, etc.) |
| [`plan_slides.md`](plan_slides.md) | Plan pour un support de présentation (slides) |

---

*Les intégrations mises en avant dans l’app sont **Airtable**, **n8n**, **Supabase**, le **chatbot Stacky** et l’**assistant IA**.*

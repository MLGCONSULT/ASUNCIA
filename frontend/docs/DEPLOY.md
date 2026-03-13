# Déploiement AsuncIA (Netlify)

## Checklist

- [ ] `npm run build` sans erreur en local
- [ ] Variables d'environnement définies dans Netlify (Site settings → Environment variables), voir `.env.example`
- [ ] Migrations Supabase appliquées
- [ ] `NEXT_PUBLIC_SITE_URL` = l'URL finale du site (ex. `https://ton-site.netlify.app`)

## Déployer via Git (méthode recommandée)

Le build s'exécute sur les serveurs Netlify (Linux), ce qui évite les erreurs de publication en local (ex. "Failed publishing static content" sous Windows).

1. **Pousser le code** vers GitHub, GitLab ou Bitbucket.

2. **Connecter le dépôt** : Netlify → **Site settings → Build & deploy → Continuous deployment** → connecter le dépôt et la branche à déployer (ex. `main`).

3. **Build settings** :
   - **Build command** : `npm run build`
   - **Publish directory** : `.next` (ou laisser vide pour que le plugin Next.js utilise la valeur du `netlify.toml`)
   - **Base directory** : si la racine du repo contient le dossier `asuncia` (et que l'app Next est dedans), mettre `asuncia` ; sinon laisser vide

4. **Environment variables** : Site settings → Environment variables → ajouter les variables comme dans ton `.env` (voir `.env.example` pour la liste).

5. Chaque **push** sur la branche connectée déclenche un déploiement. Le build et la publication ont lieu sur Netlify.

## Déployer avec Netlify CLI

En local sous Windows, l'étape de publication peut échouer ("Failed publishing static content") ; dans ce cas, utiliser le déploiement via Git ci-dessus.

1. **Installer le CLI** (une fois) : `npm install -g netlify-cli`
2. **Se connecter** (une fois) : `netlify login` (ouvre le navigateur)
3. **Lier le site** (une fois, dans le dossier `asuncia`) :
   - Site déjà créé : `netlify link` → choisis équipe + site
   - Nouveau site : `netlify init` → Create & configure a new site
4. **Déployer en prod** : `npm run deploy:netlify` ou `netlify deploy --prod`

Variables d'environnement : Netlify → Site settings → Environment variables.  
Sans `--prod` : `netlify deploy` = déploiement preview (URL temporaire).

## Obligatoire

- **Supabase :** https://supabase.com → créer un projet → `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Netlify :** connecter le repo (ou utiliser la CLI), build = `npm run build`, publish = `.next`

## Optionnel

- **OpenAI :** https://platform.openai.com/api-keys → chat IA
- **Gmail :** https://console.cloud.google.com → OAuth → page Mails
- **MCP (n8n, Notion, Airtable, Gmail) :** voir commentaires et liens dans `.env.example`

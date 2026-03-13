# Configuration Netlify pour AsuncIA

## Build settings (Site configuration > Build & deploy > Build settings)

- **Base directory** : `asuncia` (si le dépôt Git a pour racine le dossier parent de `asuncia/`)
- **Build command** : laisser vide pour utiliser celle du `netlify.toml` (`npm run build`)
- **Publish directory** : laisser vide (géré par le plugin Next.js)

## Déploiement en ligne de commande

Toujours lancer depuis le dossier de l’app :

```bash
cd asuncia
netlify deploy --prod
```

## Variables d’environnement (Environment variables)

À définir dans **Site configuration > Environment variables** pour la production. Les fichiers `.env` / `.env*.local` ne sont pas versionnés.

### Obligatoires (auth + build)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anonyme Supabase |
| `OPENAI_API_KEY` | Clé API OpenAI (chat) |

### Optionnelles selon les fonctionnalités

| Variable | Description |
|----------|-------------|
| `OPENAI_CHAT_MODEL` | Modèle de chat (défaut : `gpt-4o-mini`) |
| `NEXT_PUBLIC_SITE_URL` | URL du site (ex. `https://xxx.netlify.app`) pour OAuth / déconnexion |
| `SUPABASE_ACCESS_TOKEN` | Pour MCP Supabase |
| `SUPABASE_PROJECT_REF` | Référence projet Supabase (si pas déduit de l’URL) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth Gmail |
| `GMAIL_MCP_URL` | URL du serveur MCP Gmail |
| `N8N_BASE_URL` / `N8N_API_KEY` | API REST n8n |
| `N8N_MCP_URL` / `N8N_MCP_ACCESS_TOKEN` | MCP n8n |
| `AIRTABLE_TOKEN` ou `AIRTABLE_API_KEY` | API Airtable |
| `AIRTABLE_MCP_URL` / `AIRTABLE_MCP_TOKEN` | MCP Airtable |
| `NOTION_API_KEY` ou `NOTION_TOKEN` | API Notion |
| `NOTION_MCP_URL` / `NOTION_MCP_TOKEN` | MCP Notion |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` | SMTP (nodemailer) |
| `DEFAULT_FROM_EMAIL` | Adresse d’envoi par défaut |

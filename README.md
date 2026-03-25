# SITE_FORMATION — AsuncIA (frontend + backend)

Monorepo : **interface Next.js** + **API NestJS** (déploiement typique : **deux projets Vercel**).

## Démonstration en ligne

| Service | URL |
|---------|-----|
| **Application** | [https://asuncia.vercel.app](https://asuncia.vercel.app) |
| **API (NestJS)** | [https://asuncia-backend.vercel.app](https://asuncia-backend.vercel.app) |

Le backend répond à la racine avec un message JSON confirmant que le service est en ligne ; les routes métier sont sous `/api/...`.

### Vérifications rapides (GET, réponse JSON)

Remplacez `BASE` par `https://asuncia-backend.vercel.app` :

- `BASE/api/health/mcp-supabase`
- `BASE/api/health/mcp-airtable`
- `BASE/api/health/mcp-n8n`

*(Un statut HTTP 503 sur un de ces points indique souvent que le connecteur concerné n’est pas configuré côté variables d’environnement.)*

## Structure du dépôt

```
SITE_FORMATION/
├── frontend/      # Next.js — UI, auth Supabase
├── backend-nest/  # API NestJS — chat IA, MCP, auth (déploiement principal)
├── backend/       # API Express (héritage / parallèle selon branche)
└── z_docs/        # Guides, dont DOC_TECHNIQUE.md
```

## Documentation

- **Technique (jury / reprise projet)** : [`z_docs/DOC_TECHNIQUE.md`](z_docs/DOC_TECHNIQUE.md)
- **Support de présentation (slides)** : [`plan_slides.md`](plan_slides.md) — plan prêt pour un designer non technique
- **MCP (détail)** : `backend/docs/MCP.md`

## Prérequis locaux

- Node.js 18+
- Compte [Supabase](https://supabase.com)

## Démarrage local (résumé)

```bash
npm install
```

Configurer `frontend/.env.local` (voir `frontend/.env.example`) avec notamment `NEXT_PUBLIC_BACKEND_URL` pointant vers l’API locale ou déployée.

Pour le backend NestJS : voir `backend-nest/.env.example` et la documentation MCP.

## Checks de production

À la racine du repo (si script défini) :

```bash
npm run check
```

---

*Les intégrations exposées dans l’interface actuelle sont centrées sur **Airtable**, **n8n**, **Supabase** et l’**assistant IA**. La documentation de présentation évite de mettre en avant d’anciennes pistes non intégrées à l’app.*

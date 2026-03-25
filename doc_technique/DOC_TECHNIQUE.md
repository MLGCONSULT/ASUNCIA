# Documentation technique — AsuncIA (version jury / production)

Document court pour **reprendre le projet** ou **valider le déploiement**, sans décrire d’anciennes pistes abandonnées.

## URLs de démonstration (public)

| Rôle | URL |
|------|-----|
| **Frontend (app web)** | [https://asuncia.vercel.app](https://asuncia.vercel.app) |
| **Backend (API NestJS)** | [https://asuncia-backend.vercel.app](https://asuncia-backend.vercel.app) |

Le backend répond à la racine par un JSON du type : `message` + `hint` sur le préfixe `/api/...`.

## Vérifications « santé » (accessibles dans le navigateur)

Les endpoints sont en **GET** ; le préfixe **`/api`** est celui utilisé par le frontend vers le backend.

Remplace `BASE` par `https://asuncia-backend.vercel.app`.

| Endpoint | Rôle |
|----------|------|
| `BASE/` | Message de présence du serveur |
| `BASE/api/health/mcp-supabase` | Vérifie la configuration MCP Supabase (`ok: true` ou `503` + message si non configuré) |
| `BASE/api/health/mcp-airtable` | Idem pour Airtable (OAuth ou token serveur selon config) |
| `BASE/api/health/mcp-n8n` | Idem pour n8n |

**Lecture pour le jury :** un `503` avec un message explicite signifie souvent « variable d’environnement manquante pour ce connecteur », pas une panne du serveur lui-même.

## Architecture (résumé)

- **Frontend** : Next.js, authentification Supabase, appels vers le backend avec `Authorization: Bearer <JWT>`.
- **Backend** : NestJS (projet `backend-nest`), chat OpenAI, clients MCP pour Airtable, n8n, Supabase.
- **Données** : projet Supabase (utilisateurs, conversations IA, tokens OAuth selon les intégrations).

## Variables d’environnement essentielles

- **Backend** : `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, clés Supabase serveur, `FRONTEND_URL` / `ALLOWED_ORIGINS`, variables MCP par connecteur (voir `doc_technique/04-mcp-et-integrations.md` et `14-guide-configuration-mcp.md` pour la liste des variables).
- **Frontend** : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_BACKEND_URL` = URL du backend (ex. `https://asuncia-backend.vercel.app`).

## Périmètre fonctionnel (interface)

Ce qui est **mis en avant dans l’application** :

- Tableau de bord
- **Airtable** (bases / tables / enregistrements via MCP)
- **n8n** (workflows / automatisation)
- **Supabase** (données / requêtes guidées)
- **Chatbot Stacky** (page `/app/chatbot`) : même expérience que la page publique [typebot.co/stacky-asuncian](https://typebot.co/stacky-asuncian), affichée dans l’app via **iframe** (évite les erreurs « bot introuvable » liées au slug vs ID interne Typebot).
- **Assistant IA** intégré (chat avec **un seul fil d’historique** par utilisateur, pas de liste de conversations)

Il n’y a **pas d’écran « Leads »** dans l’app actuelle ; l’assistant ne doit pas renvoyer vers une page Leads inexistante.

## Documentation complémentaire

- `doc_technique/04-mcp-et-integrations.md` — rôle des MCP dans le projet
- `doc_technique/14-guide-configuration-mcp.md` — variables et ordre de configuration
- Code source du backend : **`backend-nest/`** (NestJS). Un dossier `backend/` (Express) peut exister dans le dépôt à titre historique ; **la référence de déploiement et de documentation est NestJS.**

---

*Dernière mise à jour : alignée sur les URLs de production ci-dessus et sur `backend-nest/`.*

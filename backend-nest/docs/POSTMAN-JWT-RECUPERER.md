# Où récupérer le JWT Supabase pour le test Postman

## Contexte

Pour appeler `GET .../api/auth/airtable/redirect`, le backend exige un header :
`Authorization: Bearer <JWT>`. Ce JWT est celui de ta **session Supabase** (créée quand tu te connectes sur le site).

---

## Méthode recommandée : onglet Network (Réseau)

C'est la plus fiable : tu vois **exactement** le token envoyé au backend.

### 1. Quel « front » ?

Le **front = ton site Next.js** (l'app AsuncIA) :

- En local : `http://localhost:3000`
- En prod : `https://asuncia.vercel.app` (ou l'URL de ton front déployé)

Tu dois être sur ce site, dans un navigateur (Chrome, Edge, Firefox, etc.).

### 2. À quel moment ?

**Après t'être connecté.** Pas pendant la saisie email/mot de passe.

1. Ouvre le site (accueil ou page de connexion).
2. Va sur la **page de connexion** (ex. `/connexion`).
3. Saisis email et mot de passe, valide.
4. Une fois connecté, tu es redirigé (souvent vers le **dashboard** ou `/app`).
5. **C'est à ce moment-là** que tu récupères le token : tu es déjà connecté, tu restes sur le même onglet.

### 3. Où trouver le token précisément (Network)

1. **Ouvre les DevTools**  
   - Raccourci : `F12` ou `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac).  
   - Onglet : **Network** (ou **Réseau** si l'interface est en français).

2. **Déclencher une requête vers le backend**  
   Une requête qui envoie le JWT au backend, par exemple :
   - Aller sur la page **Airtable** du dashboard : `/app/airtable`  
     → le front appelle au moins `/api/auth/airtable/status`.
   - Ou cliquer sur **« Se connecter à Airtable »**  
     → le front appelle `/api/auth/airtable/redirect`.
   - Ou aller sur une autre page d'app qui appelle le backend (chat, Mails, Notion, etc.).

3. **Repérer la requête vers le backend**  
   Dans la liste des requêtes (colonnes Name, Status, etc.) :
   - Cherche une requête dont l'URL contient :
     - en prod : `asuncia-backend.vercel.app` ou ton URL backend,
     - ou un chemin comme `redirect`, `status`, `conversations`, `chat`, etc.

4. **Cliquer sur cette requête**  
   Dans le panneau de détail à droite (ou en bas) :
   - Onglet **Headers** (En-têtes).
   - Section **Request Headers** (En-têtes de la requête).

5. **Copier la valeur du JWT**  
   - Trouve la ligne **`Authorization`**.  
   - La valeur est du type : `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (très longue).  
   - Pour Postman : copie **tout ce qui est après** `Bearer ` (avec l'espace après « Bearer »).  
     Donc uniquement : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (sans le mot « Bearer »).

6. **Dans Postman**  
   - Header : **Key** = `Authorization`, **Value** = `Bearer <colle ici le JWT copié>`  
   (donc tu remets bien le mot `Bearer ` devant le token).

---

## Méthode alternative : Cookies (Application)

Supabase stocke la session dans des **cookies**. Tu peux les inspecter, mais le JWT est souvent découpé ou encodé ; **copier depuis l'onglet Network est plus simple**. DevTools → **Application** → **Cookies** → ton site → chercher un nom du type `sb-...-auth-token`.

---

## Récap

| Question | Réponse |
|----------|--------|
| **Quel front ?** | Le site où tu te connectes (localhost:3000 ou asuncia.vercel.app). |
| **Quand ?** | Après connexion, une fois sur le dashboard / une page d'app. |
| **Où exactement ?** | DevTools → Network → une requête vers le backend → Headers → **Authorization** → valeur après `Bearer `. |
| **Dans Postman ?** | Header `Authorization` = `Bearer ` + le JWT copié. |

Si après connexion tu ne vois **aucune** requête vers le backend en allant sur `/app/airtable`, recharge la page avec l'onglet Network déjà ouvert : la requête vers `status` (ou une autre) apparaîtra et tu pourras y récupérer le JWT.

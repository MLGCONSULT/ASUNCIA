# 11 — Budget et coûts

## À quoi sert ce chapitre

On n’a pas toujours besoin d’une **feuille de calcul** détaillée pour parler coûts. En revanche, montrer qu’on a **réfléchi** aux postes évite l’image d’une stack « gratuite magique » ou, à l’inverse, surdimensionnée.

## Postes à avoir en tête

**Supabase** — Selon volume de données, trafic et options, le gratuit peut suffire longtemps ; un petit plan payant peut arriver vite si le projet grossit.

**Hébergement** — Front et API (souvent deux déploiements) : coût lié au **trafic** et au **temps de build**.

**OpenAI (ou équivalent)** — Variable selon le **modèle**, la **longueur** des conversations et la **fréquence** d’usage. Souvent le poste le plus **sensible** si l’app est utilisée intensivement.

**MCP / outils externes** — Selon les fournisseurs : coût direct, ou coût **indirect** (temps de maintenance, infra).

## Comment en parler simplement

Rester **honnête** : en phase démo ou faible usage, les coûts restent **modestes** ; ils **montent** avec la volumétrie et l’usage IA. L’architecture choisie n’est pas là pour **gaspiller** : elle reste **compréhensible** et **pilotable**.

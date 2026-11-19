# Dollars Bijoux — site e-commerce

Site de bijoux personnalisés (React + Vite + TypeScript), données dans **Supabase**, commandes finalisées sur **WhatsApp**.

## Lancer en local
```bash
npm install
npm run dev
```
Les variables sont facultatives (valeurs publiques par défaut dans `src/lib/core.ts`). Voir `.env.example`.

| Variable | Rôle |
|---|---|
| `VITE_SUPABASE_URL` | URL du projet Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clé publique (jamais la clé secrète) |
| `SITE_URL` | Adresse du site pour le partage et le sitemap (ex. `https://dollarsbijoux.com`) |

## Structure
- `src/pages/` : Accueil, Boutique, Produit, Panier/Commande, pages secondaires
- `src/components/` : mise en page (bandeau promo, en-tête, menu mobile, pied de page, mini-panier), cartes produit, aperçu de gravure
- `src/data/api.ts` : toutes les lectures Supabase (TanStack Query)
- `src/store/cart.ts` : panier enregistré sur le téléphone (localStorage)
- `src/lib/whatsapp.ts` : construction du message de commande
- `scripts/sitemap.mjs` : génère `sitemap.xml` et `robots.txt` au build

## Base de données
Projet Supabase `dollars-bijoux`. Les prix affichés viennent de la vue `option_prices` (promos appliquées automatiquement selon les dates). Le public peut créer une commande (`order_intents`) mais pas les lire.

## Images
Chemin commençant par `/` : fichier de `public/` (photos de démonstration). Sinon : bucket Supabase `media`, variantes `_sm`, `_md`, `_lg` en WebP.

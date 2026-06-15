# Weight Tracker

Application PWA de suivi de poids avec photos d'évolution, hébergée sur **Vercel** et synchronisée via **Supabase**.

## Déploiement Vercel

### 1. Variables d'environnement (obligatoire)

Dans [Vercel](https://vercel.com) → projet **weight-tracker** → **Settings** → **Environment Variables**, ajoute :

| Variable | Où la trouver |
|----------|---------------|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public |

Coche **Production** (et Preview si tu veux). Puis **Deployments → Redeploy** (obligatoire : Vite injecte ces vars au build).

Via CLI :

```bash
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel --prod
```

### 2. Schéma Supabase

Dans Supabase → **SQL Editor**, exécute tout le fichier `supabase/schema.sql` puis **Run**.

Tables créées : `entries`, `user_settings`, `daily_photos` + bucket Storage `progress-photos`.

### 3. URL de prod

https://weight-tracker-steel-eight.vercel.app

## Sécurité du lien

Pas de compte utilisateur : le paramètre `?id=user_...` agit comme clé privée. Ne partage pas ton lien personnel.

## Dev local

```bash
cp .env.example .env.local
# Remplis VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

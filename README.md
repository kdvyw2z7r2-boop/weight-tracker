# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Stockage cloud Supabase

L'application peut rester hébergée sur GitHub Pages. Le stockage cloud des poids passe par Supabase depuis le frontend, avec un fallback local si Supabase n'est pas encore configuré ou indisponible.

### 1. Créer la table

Dans Supabase, ouvre le SQL editor et exécute `supabase/schema.sql`.

La table utilisée est `public.weight_histories` : une ligne par utilisateur anonyme, avec `user_id` et un tableau JSON `weights`.

### 2. Ajouter les variables GitHub Pages

Dans GitHub > Settings > Secrets and variables > Actions, ajoute :

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Ces valeurs sont publiques côté frontend, mais elles doivent être présentes au build Vite. Si elles manquent, l'app reste utilisable en mode local.

### 3. Sécurité du lien

Il n'y a pas de compte utilisateur. Le paramètre `?id=user_...` agit comme un lien privé : ne partage pas ton lien personnel, partage l'URL sans `?id=` pour que chacun reçoive son propre identifiant.


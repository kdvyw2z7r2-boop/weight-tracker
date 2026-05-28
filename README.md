# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Déploiement Vercel + KV

L'application doit être hébergée sur Vercel pour que l'endpoint `/api/weights` et le stockage cloud KV fonctionnent. GitHub Pages ne sert que les fichiers statiques et ne peut pas exécuter cette API.

Configuration Vercel attendue :

- Framework preset : Vite
- Build command : `npm run build`
- Output directory : `dist`
- API route : `api/weights.js`
- Variables d'environnement KV/Redis fournies par l'intégration Vercel Storage/Upstash (`KV_REST_API_URL`, `KV_REST_API_TOKEN`, etc.)

Une fois le projet relié à Vercel et le store KV/Redis connecté, chaque utilisateur conserve son historique via son identifiant `?id=...`.


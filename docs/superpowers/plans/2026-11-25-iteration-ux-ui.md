# Itération qualité — bugs, affichage, UX/UI, esthétique — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger les bugs de calcul/affichage relevés à l'audit du 25/11/2026, unifier le design « electric rock » et lisser l'UX mobile, sans changer le modèle de données.

**Architecture:** Logique pure extraite dans `src/utils/*` et couverte par Vitest ; composants React minces qui consomment ces utils. Les couleurs passent toutes par les tokens CSS de `src/index.css`. Les dialogues natifs (`alert`/`confirm`) sont remplacés par un composant `ConfirmSheet` réutilisable.

**Tech Stack:** React 19, Vite 8, Tailwind 4, Recharts 3, date-fns 4, Supabase, Vitest (ajouté en tâche 1).

**Spec:** audit du 25/11/2026 (section « Constats » ci-dessous) — pas de spec séparée.

## Constats de l'audit (source de vérité de ce plan)

| # | Type | Constat | Preuve |
|---|------|---------|--------|
| A1 | Bug | Effacer « Poids cible » ou « Taille » enregistre `0` à chaque frappe → anneau/IMC cassés | `SettingsScreen.jsx` `Number(value) \|\| 0` |
| A2 | Bug | Projection Progrès : vitesse calculée **par pesée**, pas **par jour** | `ProgressScreen.jsx` `dailyRate = …/(last30.length-1)` |
| A3 | Bug | Filtre de période en UTC (`toISOString`) → décalage d'un jour le soir | `ProgressScreen.jsx` `cutoffIso` |
| A4 | Bug | Rythme du plan toujours en « kg/sem. », même en lbs ; pas converti au changement d'unité | `weightPlan.js formatPace`, `useSync convertAllUnits` |
| A5 | Affichage | Formats de poids incohérents : `87.8 kg` (anneau) vs `82,8` (hero) vs `83 kg` (journal) | captures Dashboard/Journal |
| A6 | Bug build | `package-lock.json` désynchronisé → `npm ci` échoue | `npm ci` : *Missing @emnapi/core* |
| A7 | Qualité | 5 erreurs + 3 warnings ESLint | `npm run lint` |
| A8 | Dette | Code mort : `PlanScreen`, `StatsScreen`, `BMICard`, `QuickStatCard`, `StreakCard` non importés | grep imports |
| A9 | UX | Bandeau rouge permanent « Supabase non configuré / Mode local » : alarme pour un état normal | captures |
| A10 | UI | Le FAB recouvre le contenu (graphique, lien « Modifier » du plan) ; dernier élément caché par la nav | captures Dashboard/Progrès |
| A11 | UX | `alert()` / `confirm()` natifs (import, reset, effacement) | `SettingsScreen.jsx` |
| A12 | UX | Rappels : interrupteur sans effet réel (aucune planification) | aucun usage de `reminderTime` |
| A13 | Esthétique | Palette double : néon (`#00e5ff`, `#bf00ff`) + anciennes teintes (`#A78BFA`, `#60A5FA`, `#4ADE80`, `#FBBF24`) codées en dur | `WeightChart`, `PlanChart`, `ProgressRing` |
| A14 | Copy | Titre « WEIGHT » en anglais dans une UI française | `DashboardScreen.jsx` |
| A15 | A11y | Icônes caméra/corbeille du journal < 44 px, sans `aria-label` explicite ; contraste `text-tertiary` faible | capture Journal |
| A16 | Réglage mort | `theme: 'dark'` stocké mais jamais lu | `defaultSettings` |

## Global Constraints

- Langue UI : français ; décimales à virgule en kg **et** en lbs (locale `fr`).
- Format poids : 1 décimale partout (`82,8`, `83,0`), unité séparée par une espace insécable.
- Cibles tactiles ≥ 44×44 px ; contraste texte ≥ 4.5:1 sur `--color-bg-card`.
- Aucune couleur hexadécimale en dur dans `src/components` et `src/screens` hors `index.css`.
- Ne pas modifier le schéma Supabase ni la forme de `settings` (ajouts seulement).
- Chaque tâche : `npm run lint` et `npm run build` verts avant commit.

## Review Focus

- Changement kg→lbs→kg aller-retour : poids, cible, départ défi/plan, rythme reviennent à ±0,01 → test dans Tâche 3.
- Champ numérique vidé puis quitté : la valeur précédente est restaurée, rien n'est enregistré à 0 → test dans Tâche 4.
- Une seule pesée / zéro pesée : graphiques et anneau affichent un état vide propre, pas `NaN`/`Infinity` → test dans Tâche 2.
- Fuseau horaire : pesée saisie à 23 h 30 apparaît le bon jour dans tous les filtres → test dans Tâche 2 (TZ=Pacific/Kiritimati et TZ=America/Los_Angeles).
- Mode hors ligne : l'app reste utilisable, l'état est signalé sans alarme → vérif visuelle Tâche 6.

---

### Itération 1 — Fondations & bugs

### Task 1: Outillage (lockfile, Vitest, lint vert, code mort)

**Files:**
- Modify: `package.json`, `package-lock.json`, `src/screens/DashboardScreen.jsx`, `src/hooks/useSync.js:534`, `src/components/PhotoCropModal.jsx:14`
- Delete: `src/screens/PlanScreen.jsx`, `src/screens/StatsScreen.jsx`, `src/components/{BMICard,QuickStatCard,StreakCard}.jsx`
- Create: `src/utils/challenge.test.js`

**Interfaces:** Produces: script `npm test` (= `vitest run`).

- [ ] **Step 1:** `npm install -D vitest` puis `npm ci` → doit réussir (A6).
- [ ] **Step 2:** Porter les assertions de `challenge.js` (déjà vérifiées à la main) dans `challenge.test.js` ; `npm test` → PASS.
- [ ] **Step 3:** Supprimer le code mort (A8) ; `grep -r "PlanScreen\|StatsScreen" src` → vide.
- [ ] **Step 4:** Corriger les 5 erreurs lint (A7) : variables inutilisées, `throw new Error(msg, { cause })`, reset du crop via `key` au lieu d'un `setState` dans l'effet.
- [ ] **Step 5:** `npm run lint` → 0 erreur ; `npm run build` → OK. Commit `chore: lockfile, vitest, lint vert, code mort`.

### Task 2: Calculs de progression fiables (A2, A3)

**Files:**
- Create: `src/utils/dates.js`, `src/utils/projection.js`, tests associés
- Modify: `src/screens/ProgressScreen.jsx:43-61`, `src/utils/challenge.js` (réutilise `todayIso`)

**Interfaces:**
- Produces: `localIsoDate(date: Date) -> 'yyyy-MM-dd'` ; `daysAgoIso(n: number, now?: Date) -> string` ; `projectGoalDate(entries, targetWeight, now?) -> { ratePerDay: number|null, date: string|null }`

- [ ] **Step 1: Tests**
```js
test('vitesse par jour, pas par pesée', () => {
  const e = [{ date: '2026-11-21', weight: 80 }, { date: '2026-11-01', weight: 82 }]
  expect(projectGoalDate(e, 78, new Date('2026-11-21')).ratePerDay).toBeCloseTo(-0.1)
  expect(projectGoalDate(e, 78, new Date('2026-11-21')).date).toBe('2026-12-11')
})
test('pas de projection si on s’éloigne de l’objectif ou < 2 pesées', () => {
  expect(projectGoalDate([{ date: '2026-11-01', weight: 80 }], 78).date).toBeNull()
  expect(projectGoalDate([{ date: '2026-11-10', weight: 81 }, { date: '2026-11-01', weight: 80 }], 78).date).toBeNull()
})
test('daysAgoIso est local', () => expect(daysAgoIso(0, new Date(2026, 10, 25, 23, 30))).toBe('2026-11-25'))
```
- [ ] **Step 2:** `npm test` → FAIL (modules absents).
- [ ] **Step 3:** Implémenter ; `projectGoalDate` utilise la régression linéaire sur les 30 derniers **jours** (pas pesées) ; retourne `null` si pente ≥ 0 vers l'objectif.
- [ ] **Step 4:** Brancher `ProgressScreen` ; `npm test` → PASS ; `TZ=America/Los_Angeles npm test` → PASS.
- [ ] **Step 5:** Commit `fix: projection par jour et dates locales`.

### Task 3: Unités & formats unifiés (A4, A5)

**Files:**
- Create: `src/utils/format.js` (+ test)
- Modify: `src/utils/weightPlan.js` (`formatWeight`, `formatPace` → réexport), `src/hooks/useSync.js convertAllUnits`, `ProgressRing.jsx`, `EntryCard.jsx`, `DashboardScreen.jsx`

**Interfaces:**
- Produces: `formatWeight(value, unit) -> '82,8'` ; `formatWeightWithUnit(value, unit) -> '82,8 kg'` ; `formatPace(pace, unit) -> '0,40 kg/sem.' | '0,88 lbs/sem.'`

- [ ] **Step 1: Tests** — `formatWeight(83,'kg')==='83,0'`, `formatWeight(181.5,'lbs')==='181,5'`, `formatPace(0.4,'lbs')==='0,40 lbs/sem.'`, `formatWeight(null)==='—'` ; aller-retour `convertAllUnits` kg→lbs→kg sur `{weight, targetWeight, planStartWeight, challengeStartWeight, weeklyPace}` à ±0,01 (extraire la conversion en `convertSettingsUnit(settings, nextUnit)` pur).
- [ ] **Step 2:** FAIL → implémenter → PASS.
- [ ] **Step 3:** Remplacer tous les affichages de poids par `formatWeightWithUnit` (grep `} {unit}` et `{settings.unit}`).
- [ ] **Step 4:** Commit `fix: formats de poids et rythme cohérents en kg et lbs`.

### Task 4: Saisie des réglages robuste (A1)

**Files:**
- Create: `src/components/NumberField.jsx`
- Modify: `src/screens/SettingsScreen.jsx`

**Interfaces:** Produces: `<NumberField label value min max step suffix onCommit(number) />` — état local, valide et enregistre au `blur`/Entrée seulement ; hors bornes ou vide → restaure `value`.

- [ ] **Step 1:** Bornes : taille 120–230 cm ; cible 30–250 kg (66–550 lbs). `inputMode="decimal"`, accepte la virgule.
- [ ] **Step 2:** Test Playwright manuel : vider « Poids cible », quitter le champ → la valeur d'origine revient, `localStorage` inchangé.
- [ ] **Step 3:** Commit `fix: champs numériques des réglages validés au blur`.

### Itération 2 — UX

### Task 5: `ConfirmSheet` et toasts à la place des dialogues natifs (A11)

**Files:** Create `src/components/ConfirmSheet.jsx`, `src/components/Toast.jsx` ; Modify `SettingsScreen.jsx`, `PhotoViewerModal.jsx`, `EntryCard.jsx` (suppression).

**Interfaces:** `<ConfirmSheet open title message confirmLabel tone="danger|default" onConfirm onCancel />` ; `useToast() -> { show(message, tone) }`.

- [ ] Remplacer chaque `window.confirm`/`alert` (grep → 0 résultat), réutiliser le style des bottom-sheets existants (`PhotoActionSheet`).
- [ ] Suppression d'une pesée : toast « Pesée supprimée · Annuler » (5 s) au lieu d'une confirmation.
- [ ] Commit `feat: confirmations et toasts intégrés`.

### Task 6: États système discrets & mise en page (A9, A10, A14)

**Files:** Modify `src/App.jsx`, `src/index.css`, `src/screens/DashboardScreen.jsx`, `src/screens/ProgressScreen.jsx`

- [ ] Bandeau : config Supabase absente/hors ligne → pastille neutre « Hors ligne · données locales » dans l'en-tête ; rouge réservé aux erreurs d'action.
- [ ] `main` : `padding-bottom: calc(nav + FAB + 16px + safe-area)` ; FAB masqué au scroll vers le bas, réaffiché au scroll vers le haut.
- [ ] Titre Dashboard « WEIGHT » → « Mon poids ».
- [ ] Vérif : captures 390×844 des 4 onglets, aucun élément interactif sous le FAB ou la nav.
- [ ] Commit `ui: états hors ligne discrets, FAB et marges corrigés`.

### Task 7: Rappels réels ou retirés (A12, A16)

- [ ] Décision produit **à valider avec toi** : (a) notification locale via Service Worker à `reminderTime` quand l'app est installée (PWA, iOS ≥ 16.4), ou (b) retirer l'interrupteur. Par défaut : (a) si PWA installée, sinon message « Installe l'app pour activer les rappels ».
- [ ] Supprimer `theme` de l'UI (non utilisé) ou le câbler — recommandation : supprimer (app sombre par design).
- [ ] Commit `feat: rappels quotidiens PWA`.

### Itération 3 — Design & esthétique

### Task 8: Tokens de couleur uniques (A13)

**Files:** Modify `src/index.css`, `WeightChart.jsx`, `PlanChart.jsx`, `BmiChart.jsx`, `ProgressRing.jsx`, `WeightPlanModal.jsx`, `SettingsScreen.jsx`

- [ ] Tokens : `--color-weight` (cyan), `--color-plan` (violet néon), `--color-avg` (vert), `--color-goal` (ambre), `--color-grid`. Recharts lit `getComputedStyle` via un hook `useThemeColors()`.
- [ ] Vérif : `grep -rnE "#[0-9A-Fa-f]{6}" src/components src/screens` → 0.
- [ ] Commit `style: palette unifiée via tokens`.

### Task 9: Accessibilité & finitions (A15)

- [ ] Boutons icônes journal : zone 44×44, `aria-label="Ajouter une photo du 25 novembre"` / `"Supprimer la pesée du …"`.
- [ ] Contraste : relever `--color-text-tertiary` jusqu'à 4.5:1 sur `--color-bg-card`.
- [ ] `prefers-reduced-motion` : désactiver animations d'entrée, glow et compteur animé.
- [ ] Graphiques : légende courte (Poids · Moyenne 7 j · Plan) sous le Dashboard.
- [ ] Commit `a11y: cibles tactiles, contraste, mouvement réduit`.

### Task 10: Revue finale

- [ ] `npm ci && npm run lint && npm test && npm run build` verts.
- [ ] Captures avant/après des 4 onglets + Réglages (390×844, DPR 2) jointes à la PR.
- [ ] superpowers:requesting-code-review sur la branche complète.

# Mensurations, badges, bilan hebdo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter mensurations (saisie, évolution, synchro), badges calculés avec célébration et vitrine, et un bilan hebdomadaire sur le dashboard.

**Architecture:** Toute la logique est pure dans `src/utils/measurements.js`, `src/utils/badges.js`, `src/utils/weeklyReview.js` (tests Vitest). Les mensurations vivent dans `settings.measurements` et se synchronisent via `src/utils/syncMerge.js` (union par id + marqueurs existants). L'UI utilise les primitives Liquid Glass (`src/components/ui/*`).

**Tech Stack:** React 19, Tailwind 4, Recharts 3, date-fns 4, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-27-mensurations-badges-bilan-design.md`

## Global Constraints
- Aucun changement de schéma Supabase ; `settings` : ajouts seulement (`measurements`).
- UI en français ; poids via `formatWeight*`, cm avec 1 décimale et virgule (« 82,5 cm »).
- Style Liquid Glass (primitives `GlassCard`, `SegmentedControl`, `GlassButton`, tokens) ; aucune couleur hex dans components/screens ; cibles ≥ 44 px ; `prefers-reduced-motion`.
- Semaine = lundi→dimanche en heure locale (`date-fns` `startOfWeek(..., { weekStartsOn: 1 })`).
- Chaque tâche : `npm test && npm run lint && npm run build` verts.

## Review Focus
- Deux appareils ajoutent chacun un relevé hors ligne → les deux survivent ; une suppression sur l'un disparaît partout → test Task 1.
- Unité lbs : seuils de badges poids en lbs du spec → test Task 2.
- Lundi vs autres jours et fuseaux (TZ=America/Los_Angeles) pour la semaine → test Task 3.
- Célébration jamais répétée après fermeture/rechargement ; plusieurs badges → une seule feuille → vérif Task 2.
- Relevé partiel (seulement taille) : total « depuis le départ » n'additionne que les zones présentes aux deux dates → test Task 1.

---

### Task 1: Mensurations (données, synchro, UI)

**Files:** Create `src/utils/measurements.js` (+ test), `src/components/measurements/MeasurementsCard.jsx`, `src/components/measurements/MeasurementSheet.jsx`, `src/components/measurements/MeasurementsList.jsx`. Modify `src/utils/syncMerge.js` (+ test), `src/hooks/useSync.js` (API), `src/screens/ProgressScreen.jsx`, `src/App.jsx`.

**Interfaces — Produces:**
- `MEASUREMENT_ZONES = [{ key:'waist', label:'Taille' }, { key:'hips', label:'Hanches' }, { key:'chest', label:'Poitrine' }, { key:'arm', label:'Bras' }, { key:'thigh', label:'Cuisse' }, { key:'neck', label:'Cou' }]`
- `listMeasurements(map) -> Measurement[]` (chronologique) ; `measurementProgress(list, challengeStartDate) -> { byZone: { [key]: { start, latest, delta } }, totalDelta: number|null, from: date|null, to: date|null }` ; `seriesForZone(list, key) -> [{ date, value }]`.
- syncMerge : `mergeMeasurements(a, b) -> map` (union, `updatedAt` max, exclut ids marqués supprimés via `isDeletedEntry`), intégré à `mergeSettings`, `mergeForSave`, `mergeForLoad` ; `updateSyncMarkers` étendu ou nouvelle fonction pour marquer un relevé supprimé.
- useSync : `saveMeasurement(m)` (création/modification, `updatedAt = Date.now()`, id `crypto.randomUUID()`), `deleteMeasurement(id)` (marque supprimé), `measurements` (liste).

- [ ] **Step 1: Tests** `measurements.test.js` : progrès avec relevés partiels (taille seule au départ, taille+hanches ensuite → total = delta taille) ; départ du défi postérieur au premier relevé ; liste vide → `totalDelta: null`. `syncMerge.test.js` : deux appareils ajoutent chacun un relevé → union ; modification concurrente → `updatedAt` max gagne ; relevé supprimé sur A (marqueur) → exclu sur B après fusion ; restauration non requise.
- [ ] **Step 2:** RED → implémenter → GREEN (aussi `TZ=America/Los_Angeles`).
- [ ] **Step 3:** UI : section « Mensurations » dans Progrès (carte avec total « −6,5 cm depuis le départ », mini-courbe par zone ayant ≥ 2 points, date du dernier relevé, bouton « Ajouter des mesures ») ; feuille de saisie (`.glass-strong`, portail, Escape, focus) avec date + 6 `NumberField` (10–250, 1 décimale, placeholder = dernière valeur), bouton désactivé tant qu'aucun champ ; liste des relevés (modifier, supprimer avec toast « Annuler » 5 s via le mécanisme existant `usePendingDelete` ou équivalent).
- [ ] **Step 4:** Playwright 390×844 : ajout de 2 relevés → total affiché ; suppression + annulation. Commit `feat(mensurations): saisie, évolution et synchro`.

### Task 2: Badges et célébration

**Files:** Create `src/utils/badges.js` (+ test), `src/components/badges/BadgeIcon.jsx`, `src/components/badges/BadgesShowcase.jsx`, `src/components/badges/CelebrationSheet.jsx`, `src/hooks/useBadgeCelebration.js`. Modify `src/screens/ProgressScreen.jsx`, `src/App.jsx`.

**Interfaces — Produces:**
- `BADGES` (14, ids stables : `loss-1`…`loss-20`, `goal-25|50|75|100`, `streak-7|30`, `photos-10`, `cm-5`) avec `title`, `description`, `icon` key.
- `computeBadges({ entries, settings, photos, measurements, today }) -> Array<{ id, title, description, earned: boolean, earnedAt: date|null, progress: { current, target, unit } }>` — perte calculée depuis le départ du défi (`resolveChallengeStart`) dans l'unité courante avec seuils lbs du spec ; `earnedAt` = première date où la condition devient vraie (parcours chronologique) ; série = plus longue série de jours consécutifs avec pesée (pas seulement l'actuelle).
- `newlyEarned(badges, seenIds) -> badge[]`.
- `useBadgeCelebration({ badges, userId, ready }) -> { toCelebrate, dismiss() }` (localStorage `wt_badges_seen:<userId>`, try/catch ; au tout premier lancement, marquer comme vus les badges déjà obtenus sans célébrer — pas d'avalanche pour un utilisateur existant).

- [ ] **Step 1: Tests** : seuils kg et lbs ; `goal-50` exactement à 50 % ; `earnedAt` correct sur une série de pesées ; série la plus longue ; `cm-5` via mensurations ; `photos-10` ; `newlyEarned`.
- [ ] **Step 2:** RED → GREEN.
- [ ] **Step 3:** UI : vitrine « Badges » dans Progrès (grille 3 colonnes, obtenus en couleur + date, à venir grisés + progression « 3,2 / 5 kg ») ; `CelebrationSheet` (portail, verre, liste des nouveaux badges, bouton « Continuer », pas d'animation si reduced-motion) déclenchée par le hook dans App.
- [ ] **Step 4:** Playwright : premier lancement avec badges déjà obtenus → pas de célébration ; ajout d'une pesée franchissant un palier → célébration unique ; rechargement → pas de re-célébration. Commit `feat(badges): paliers, célébration et vitrine`.

### Task 3: Bilan hebdo

**Files:** Create `src/utils/weeklyReview.js` (+ test), `src/components/review/WeeklyReviewCard.jsx`. Modify `src/screens/DashboardScreen.jsx`.

**Interfaces — Produces:**
- `weekBounds(date) -> { start, end }` (lundi→dimanche, ISO local).
- `weeklyReview({ entries, settings, photos, measurements, badges, weekStart }) -> { start, end, avg, prevAvg, deltaAvg, count, daysLogged, pace, planPace, bestStreak, photo, badgesEarned, measurementDelta }` (null-safe).
- `defaultReviewWeek(today, dismissedWeekStart) -> { weekStart, isLastWeekRecap }` : le lundi → semaine précédente (récap) sauf si déjà fermée pour cette semaine ; sinon semaine courante.

- [ ] **Step 1: Tests** : bornes lundi/dimanche (incl. dimanche soir et `TZ=America/Los_Angeles`) ; moyenne et delta vs semaine précédente ; semaine sans pesée → valeurs null ; lundi → récap ; récap fermé → semaine courante.
- [ ] **Step 2:** RED → GREEN.
- [ ] **Step 3:** `WeeklyReviewCard` sous la carte héro du dashboard : en-tête « Bilan de la semaine dernière » / « Cette semaine », flèches ‹ › (12 semaines max), lignes : moyenne + delta (vert/rouge selon objectif), « 5/7 pesées », rythme vs plan, photo de la semaine (vignette), badges obtenus, variation mensurations ; bouton fermer le récap (localStorage `wt_review_dismissed:<userId>`).
- [ ] **Step 4:** Playwright : lundi simulé (horloge Playwright `page.clock`) → récap ; navigation semaines. Commit `feat(bilan): bilan hebdomadaire`.

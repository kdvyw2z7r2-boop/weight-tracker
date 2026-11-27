# Refonte Liquid Glass sombre — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer l'identité néon « electric rock » par la direction « Liquid Glass sombre » validée, sur tous les écrans et surfaces de l'app.

**Architecture:** D'abord les fondations (tokens `@theme`, fond à halos, classes utilitaires de verre, primitives React `GlassCard`, `SegmentedControl`, `GlassButton`), puis une passe par zone de l'app qui consomme ces primitives, puis un nettoyage qui supprime toutes les classes néon. Les couleurs restent pilotées par tokens (graphiques via `src/utils/chartColors.js`).

**Tech Stack:** React 19, Tailwind 4 (`@theme static` dans `src/index.css`), Recharts 3, Vitest, Playwright (vérif visuelle).

**Spec:** `docs/superpowers/specs/2026-11-27-liquid-glass-design.md` (valeurs de référence exactes dans « Direction »). Référence visuelle : maquette « Liquid Glass » de https://claude.ai/artifact/UsJshEdUFZ7tH1UNiEZgWo (fichier local : `/tmp/claude-0/-home-user-weight-tracker/2181fd2e-ecc8-5668-b33f-1662136fc798/scratchpad/look/styles-poids.html`, classes `.lg`).

## Global Constraints
- Valeurs de couleur, flou, rayons, typo : exactement celles de la section « Direction » du spec.
- Aucune couleur hexadécimale en dur dans `src/components`, `src/screens`, `src/App.jsx`, `src/BottomNav.jsx` (tokens / classes ; SVG via `var(--color-…)`). Les `rgba(255,255,255,x)` neutres de la matière verre sont autorisés dans `index.css` uniquement.
- Contraste texte ≥ 4.5:1 sur la surface réelle (verre sur fond) ; cibles ≥ 44×44 px ; `prefers-reduced-motion` coupe toute animation.
- Aucun changement fonctionnel ni de données ; tests existants verts.
- `backdrop-filter` jamais animé ; repli opaque via `@supports not (backdrop-filter: blur(1px))`.
- Chaque tâche : `npm test && npm run lint && npm run build` verts, captures 390×844 (DPR 1) des écrans touchés dans `/tmp/claude-0/glass/`.

## Review Focus
- Lisibilité du texte secondaire sur verre au-dessus des halos les plus clairs (zone haut-gauche) → mesure de contraste dans Task 1 (couleur composée calculée).
- Feuilles/modales au-dessus de la barre d'onglets (portails) et du toast → vérif Task 6.
- Android/Chrome sans `backdrop-filter` performant : repli opaque lisible → vérif Task 1 (émuler via `@supports`).
- États vides et d'erreur conservent leur lisibilité dans le nouveau style → captures par tâche.
- Aucune classe néon restante → grep Task 7.

---

### Task 1: Fondations

**Files:** Modify `src/index.css`, `src/App.jsx` (fond, LoadingScreen), `src/BottomNav.jsx`, `src/components/Toast.jsx`, `src/utils/chartColors.js`. Create `src/components/ui/GlassCard.jsx`, `src/components/ui/SegmentedControl.jsx`, `src/components/ui/GlassButton.jsx`.

**Interfaces — Produces:**
- Tokens (`@theme static`) : `--color-bg-primary: #05070f`, `--color-text-primary: #f5f7ff`, `--color-text-secondary` (spec : `rgba(235,240,255,.62)`, relevé si contraste < 4.5:1), `--color-text-tertiary` (≥ 4.5:1), `--color-accent: #4aa3ff`, `--color-good: #5be0a8`, `--color-streak: #ffb347`, `--color-danger: #ff6b6b`, `--color-plan: #a78bfa`, `--color-avg: #5be0a8`, `--color-goal: #ffb347`, `--color-weight: #4aa3ff`, `--color-grid`, `--color-axis`, `--color-track: rgba(255,255,255,.12)`. Les anciens noms (`accent-blue`, `accent-green`, `accent-red`, `accent-purple`, `accent-amber`, `bg-card`, `bg-elevated`, `border`) restent définis et pointent vers les nouvelles valeurs adoucies jusqu'à la Task 7.
- Fond : `body` = couleur + halos radiaux du spec en `background-attachment: fixed` (ou pseudo-élément `position: fixed`) ; ancien `.ambient-glow` neutralisé.
- Classes : `.glass` (carte 24 px), `.glass-sm` (18 px), `.glass-pill` (999 px), `.glass-strong` (feuilles/modales, plus opaque), `.glass-track` (piste des segmentés) — avec reflet supérieur, bordure, ombre interne et repli `@supports not`.
- `GlassCard({ as='div', size='md'|'sm', className, children, ...rest })`, `SegmentedControl({ options: [{value,label}], value, onChange, ariaLabel })` (radiogroup, flèches ←/→, segments ≥ 44 px), `GlassButton({ variant='primary'|'secondary'|'danger', size='md'|'lg', ...buttonProps })`.
- Police : pile système Apple du spec sur `:root`.
- Barre d'onglets : capsule verre flottante (marges 12 px + safe-area), onglet actif pastille claire + icône accent ; `--nav-h` mis à jour pour la nouvelle hauteur.
- Toast en verre ; LoadingScreen en verre.

- [ ] **Step 1:** Implémenter tokens, fond, classes et primitives ; `chartColors.js` pointe vers les nouveaux tokens.
- [ ] **Step 2:** Test Vitest `src/utils/contrast.test.js` + helper `src/utils/contrast.js` (`relativeLuminance(rgb)`, `contrastRatio(a, b)`, `composite(fgRgba, bgRgb)`) : vérifier que texte primaire, secondaire et tertiaire composés sur le verre (blanc 14 % sur `#1a3a8f` = halo le plus clair, et sur `#05070f`) atteignent ≥ 4.5:1 ; ajuster les tokens jusqu'au vert.
- [ ] **Step 3:** Captures : Dashboard (fond + barre), écran de chargement, toast ; capture avec `backdrop-filter` désactivé (injecter `* { backdrop-filter: none !important }` + classe de repli) pour vérifier la lisibilité du repli.
- [ ] **Step 4:** Commit `style(glass): fondations Liquid Glass (tokens, fond, verre, barre d'onglets)`.

### Task 2: Écran Poids (dashboard)

**Files:** `src/screens/DashboardScreen.jsx`, `src/components/ProgressRing.jsx`, `src/components/WeightChart.jsx`. **Consumes:** Task 1 primitives.

- [ ] Hero en `GlassCard` : libellé « Poids du jour », grand chiffre graisse 200 (≈ 60 px), unité secondaire, pastille delta verte/rouge en verre teinté ; anneau de progression accent intégré (comme la maquette) ou carte séparée si plus lisible ; stats (IMC, ce mois, série) en 3 `GlassCard size="sm"` avec série en `--color-streak` ; graphique dans une carte verre, lignes 2 px sans glow, légende conservée ; titre d'écran « Mon poids » 28 px/700 casse normale + date.
- [ ] Captures avec plan actif et sans pesée ; commit `style(glass): écran Poids`.

### Task 3: Journal et ajout de pesée

**Files:** `src/screens/LogScreen.jsx`, `src/components/EntryCard.jsx`, `src/components/AddWeightModal.jsx`, `src/components/NumberField.jsx` (si utilisé), `src/components/PillSelector.jsx`.

- [ ] Liste groupée par mois façon iOS (en-tête de section discret, cartes verre), delta en pastille verre teintée, boutons icône verre 44 px ; feuille d'ajout en `.glass-strong` (poignée, champ poids géant fin, date, note, photo optionnelle) ; bouton principal `GlassButton primary`.
- [ ] Captures liste + feuille ; commit `style(glass): journal et ajout de pesée`.

### Task 4: Photos

**Files:** `src/screens/PhotosScreen.jsx`, `src/components/photos/*`, `src/components/PhotoCropModal.jsx`, `src/components/PhotoViewerModal.jsx`.

- [ ] Raccourcis en `glass-pill` (actif plus clair), mode via `SegmentedControl` (remplace `CompareModeSwitch` ou le ré-habille), comparateur dans une carte verre (étiquettes en pastilles verre sombre, poignée du rideau en verre comme la maquette), bandeau chiffres (delta en `--color-good`), slots Avant/Après en segmenté, frise : vignettes arrondies 14 px avec liseré accent sur la sélection, en-têtes de mois discrets ; feuilles/recadrage/visionneuse/défilé en `.glass-strong`.
- [ ] Captures (méthode Playwright des tâches photos : build avec env Supabase factice, requêtes supabase.co et /api/sync annulées, `wt_photos:testuser` en data-URL) ; commit `style(glass): photos`.

### Task 5: Progrès et plan

**Files:** `src/screens/ProgressScreen.jsx`, `src/components/BmiChart.jsx`, `src/components/PlanChart.jsx`, `src/components/WeightPlanModal.jsx`.

- [ ] Sélecteur de période en `SegmentedControl` ; carte IMC verre (jauge à zones adoucies via tokens, plus de gradient néon sur le chiffre) ; graphiques verre ; carte plan (rythme, prochain palier, objectif) ; modale de plan en `.glass-strong`, curseur stylé accent.
- [ ] Captures ; commit `style(glass): progrès et plan`.

### Task 6: Réglages, feuilles et tutoriel

**Files:** `src/screens/SettingsScreen.jsx`, `src/components/ConfirmSheet.jsx`, `src/components/InstallAppTutorial.jsx`, `src/components/ExportButton.jsx`, `src/App.jsx` (pastille hors ligne).

- [ ] Réglages façon iOS : groupes en cartes verre avec lignes séparées par des filets fins, interrupteurs style iOS (piste accent), champs en verre ; zone de danger en `GlassButton danger`.
- [ ] `ConfirmSheet` rendu via portail (`createPortal` vers `document.body`) pour passer au-dessus de la barre d'onglets (problème relevé à la Task 4 photos), en `.glass-strong`.
- [ ] Tutoriel d'installation et pastille « Hors ligne » en verre.
- [ ] Captures Réglages + ConfirmSheet ouverte au-dessus de la barre ; commit `style(glass): réglages et feuilles`.

### Task 7: Nettoyage et passe finale

- [ ] Supprimer de `index.css` toutes les classes et animations néon devenues inutiles (`neon-text-*`, `badge-neon*`, `card-electric`, `card-glow`, `hero-weight-gradient`, `ambient-glow`, `animate-float`, glows) et les anciens tokens d'alias non utilisés.
- [ ] `grep -rnE "neon|card-electric|card-glow|hero-weight-gradient|ambient-glow|accent-(blue|purple|pink)" src` → vide (ou justifié).
- [ ] Captures finales des 5 onglets + 3 feuilles ; `npm test && npm run lint && npm run build` ; commit `style(glass): nettoyage néon`.

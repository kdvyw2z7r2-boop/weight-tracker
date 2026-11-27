# Photos avant/après — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer les 4 entrées photo éparpillées par un onglet « Photos » unique avec comparateur avant/après (côte à côte, rideau, fondu), frise, prise guidée par calque fantôme, partage et défilé.

**Architecture:** Toute la logique de sélection (photo la plus proche, raccourcis, ordre des slots, chiffres, regroupement, fantôme) est pure dans `src/utils/progressPhotos.js` et testée Vitest. Les composants UI consomment ces fonctions ; `useSync` reste la source des données (`photosByDate`, `uploadDailyPhoto`, `deleteDailyPhoto`, `getPhotoForDate`, `reload`).

**Tech Stack:** React 19, Vite 8, Tailwind 4 (tokens `@theme` dans `src/index.css`), react-easy-crop, date-fns, Vitest (env node).

**Spec:** `docs/superpowers/specs/2026-11-27-photos-avant-apres-design.md` (lire entièrement, y compris « Décisions de détail » 1–7).

## Global Constraints
- UI en français ; poids via `formatWeight`/`formatWeightWithUnit` (`src/utils/format.js`), unité `settings.unit`.
- Aucune couleur hexadécimale en dur dans `src/components`, `src/screens`, `src/App.jsx`, `src/BottomNav.jsx` (tokens / classes Tailwind ; SVG via `var(--color-…)`).
- Cibles tactiles ≥ 44×44 px ; contraste texte ≥ 4.5:1 ; `prefers-reduced-motion` respecté (`usePrefersReducedMotion`).
- Mobile d'abord, 390 px de large, sans défilement horizontal de page.
- Pas de nouvelle dépendance ; pas de changement de schéma Supabase ni de format de stockage photo (`userId/date.webp`, 720×1280).
- Photo jamais obligatoire pour enregistrer une pesée.
- Sans Supabase : texte exact « Les photos nécessitent la connexion au cloud. » (aucun nom de variable d'environnement).
- Chaque tâche : `npm test && npm run lint && npm run build` verts avant commit.

## Review Focus
- 0 ou 1 photo : aucun crash, états vides du spec (« Ajoute ta première photo pour suivre ta transformation », « Reviens dans quelques jours ») → tests Task 1 + vérif Playwright Task 4.
- Photos sans pesée le même jour : poids pris à ±3 j sinon « — », delta « — » → tests Task 1.
- Sélection qui inverse l'ordre ou met la même photo des deux côtés → échange / bascule → tests Task 1.
- URL signée expirée (403) au partage/défilé → `reload()` puis 1 nouvelle tentative → test Task 6 (fonction pure de retry).
- Glisser le rideau au-delà des bords / au clavier → position bornée 0–100 → test Task 3.

---

### Task 1: Logique pure des photos

**Files:**
- Modify (réécrire) : `src/utils/progressPhotos.js`
- Test : `src/utils/progressPhotos.test.js`

**Interfaces — Produces** (types JSDoc ; `PhotoItem = { date: 'yyyy-MM-dd', url: string|null, storagePath: string, weight: number|null }`, `Pair = { before: PhotoItem, after: PhotoItem|null }`) :
- `weightForDate(entries, date, maxDays = 3) -> number|null` — même jour (pesée la plus récente `createdAt`), sinon plus proche à ≤ maxDays (égalité → antérieure), sinon null.
- `listPhotos(photosByDate, entries) -> PhotoItem[]` trié chronologiquement (ancien → récent).
- `nearestPhoto(photos, targetIso, { exclude } = {}) -> PhotoItem|null` — plus petit écart en jours, égalité → la plus ancienne ; `exclude` = date à ignorer.
- `shortcutPair(photos, key, { today, challengeStartDate }) -> Pair|null` ; `key ∈ 'start'|'d30'|'d7'` ; after = plus récente ; before : `start` = première photo ≥ challengeStartDate (sinon première), `d30`/`d7` = `nearestPhoto(today − N j, { exclude: after.date })`. Retourne null si before introuvable ou before.date === after.date. Avec 1 photo et `start` → `{ before: photo, after: null }`.
- `availableShortcuts(photos, ctx) -> { start: boolean, d30: boolean, d7: boolean }` (d30/d7 false si < 2 photos ou paire null).
- `selectForSlot(pair, slot, photo, photos) -> Pair` ; `slot ∈ 'before'|'after'` ; règles spec §2 : même photo que l'autre slot → l'autre bascule sur `nearestPhoto(photo.date, { exclude: photo.date })` ; ordre inversé → échange.
- `pairForJournalDate(photos, date, currentPair) -> Pair|null` (spec §2 : photo du jour = after ; before conservé si antérieur, sinon première photo ; si la date est la première photo → before = elle, after = la plus récente (after null s'il n'y a qu'une photo) ; null si aucune photo à cette date).
- `pairStats(pair, { goalIsLoss }) -> { days: number|null, delta: number|null, isGood: boolean|null }` — days = écart calendaire ; delta = after.weight − before.weight (null si un poids manque) ; isGood = delta < 0 si goalIsLoss sinon delta > 0 ; null si delta null ou 0.
- `groupByMonth(photos) -> Array<{ monthKey: 'yyyy-MM', photos: PhotoItem[] }>` chronologique.
- `ghostFor(photos, date) -> PhotoItem|null` — photo du même jour si elle existe (remplacement), sinon la plus récente antérieure.

- [ ] **Step 1: Tests** (dans `progressPhotos.test.js`, données : photos 2026-10-01, 2026-10-20, 2026-11-10, 2026-11-26 ; pesées 10-01 = 85, 10-21 = 83, 11-26 = 80) :
```js
expect(weightForDate(entries, '2026-10-20')).toBe(83)          // ±1 j
expect(weightForDate(entries, '2026-11-10')).toBeNull()         // > 3 j
expect(nearestPhoto(photos, '2026-10-27').date).toBe('2026-10-20')
expect(nearestPhoto(photos, '2026-11-18').date).toBe('2026-11-10') // égalité 8 j / 8 j → la plus ancienne
const ctx = { today: '2026-11-27', challengeStartDate: null }
expect(shortcutPair(photos, 'start', ctx)).toMatchObject({ before: { date: '2026-10-01' }, after: { date: '2026-11-26' } })
expect(shortcutPair(photos, 'd30', ctx).before.date).toBe('2026-10-20') // cible 10-28
expect(shortcutPair(photos, 'd7', ctx).before.date).toBe('2026-11-10')  // cible 11-20, exclut 11-26
expect(shortcutPair([photos[0]], 'd7', ctx)).toBeNull()
expect(shortcutPair([photos[0]], 'start', ctx)).toMatchObject({ before: { date: '2026-10-01' }, after: null })
expect(shortcutPair(photos, 'start', { ...ctx, challengeStartDate: '2026-10-15' }).before.date).toBe('2026-10-20')
// ordre / même photo
const p = { before: photos[0], after: photos[3] }
expect(selectForSlot(p, 'before', photos[3], photos)).toMatchObject({ before: { date: '2026-11-10' }, after: { date: '2026-11-26' } })
expect(selectForSlot({ before: photos[1], after: photos[2] }, 'after', photos[0], photos)).toMatchObject({ before: { date: '2026-10-01' }, after: { date: '2026-10-20' } })
expect(pairStats({ before: photos[0], after: photos[3] }, { goalIsLoss: true })).toEqual({ days: 56, delta: -5, isGood: true })
expect(pairStats({ before: photos[2], after: photos[3] }, { goalIsLoss: true }).delta).toBeNull()
expect(groupByMonth(photos).map((g) => g.monthKey)).toEqual(['2026-10', '2026-11'])
expect(ghostFor(photos, '2026-11-10').date).toBe('2026-11-10')
expect(ghostFor(photos, '2026-11-15').date).toBe('2026-11-10')
expect(ghostFor(photos, '2026-09-01')).toBeNull()
expect(pairForJournalDate(photos, '2026-11-10', { before: photos[0], after: photos[3] })).toMatchObject({ before: { date: '2026-10-01' }, after: { date: '2026-11-10' } })
expect(pairForJournalDate(photos, '2026-10-01', { before: photos[1], after: photos[3] })).toMatchObject({ before: { date: '2026-10-01' }, after: { date: '2026-11-26' } }) // date = 1re photo → elle devient before, after = la plus récente
expect(pairForJournalDate(photos, '2026-09-01', null)).toBeNull() // pas de photo ce jour
```
- [ ] **Step 2:** `npx vitest run src/utils/progressPhotos.test.js` → FAIL (exports manquants).
- [ ] **Step 3:** Implémenter les fonctions ci-dessus ; supprimer `COMPARE_OFFSETS`, `buildComparePairs`, `buildEntryComparePair`, `findPhotoOnOrAfter` si plus utilisés après la Task 4 (dans cette tâche : les garder exportés pour ne pas casser l'existant, marqués `@deprecated`).
- [ ] **Step 4:** Tests → PASS ; `npm test && npm run lint && npm run build`.
- [ ] **Step 5:** Commit `feat(photos): logique pure de sélection avant/après`.

### Task 2: Pesée sans photo obligatoire

**Files:** Modify `src/components/AddWeightModal.jsx` (≈ l.50-52, 138), `src/hooks/useSync.js` (addEntry ≈ l.675-682).

- [ ] **Step 1:** Supprimer `photoRequired` (modale et `addEntry`) ; la photo reste optionnelle et, si fournie, est envoyée comme aujourd'hui. Le texte d'aide photo ne parle plus d'obligation.
- [ ] **Step 2:** Playwright (recette dans le contexte d'exécution) : enregistrer une pesée sans photo → entrée créée.
- [ ] **Step 3:** `npm test && npm run lint && npm run build` ; commit `fix(photos): la photo n'est plus obligatoire pour une pesée`.

### Task 3: Comparateur (3 modes)

**Files:** Create `src/components/photos/PhotoComparer.jsx`, `src/components/photos/CompareModeSwitch.jsx`, `src/utils/curtain.js` + `src/utils/curtain.test.js`.

**Interfaces — Produces:**
- `clampPercent(value: number) -> number` (0–100, NaN → 50) et `percentFromPointer(clientX, rectLeft, rectWidth) -> number` dans `curtain.js`.
- `<PhotoComparer before={PhotoItem} after={PhotoItem|null} mode="side"|"curtain"|"fade" />` — ratio 9:16 par image ; hauteur bornée `max-h-[min(62vh,560px)]` ; étiquettes « Avant · 12 oct. » / « Après · 27 nov. » (`formatDateShort` sans l'année si même année que today) ; after null → panneau « Reviens dans quelques jours ».
  - curtain : after par-dessus, `clip-path: inset(0 0 0 X%)`, poignée verticale draggable (pointer events + `setPointerCapture`), `role="slider"`, `aria-valuenow`, flèches ←/→ ±5.
  - fade : `<input type="range">` 0–100 contrôlant l'opacité de l'after (défaut 50).
- `<CompareModeSwitch value onChange />` — segmenté « Côte à côte | Rideau | Fondu » ; valeur mémorisée par l'appelant.

- [ ] **Step 1:** Tests `curtain.test.js` : `clampPercent(-10)===0`, `clampPercent(140)===100`, `clampPercent(NaN)===50`, `percentFromPointer(150, 100, 200)===25`, `percentFromPointer(0,100,200)===0`.
- [ ] **Step 2:** RED → implémenter → GREEN.
- [ ] **Step 3:** Composants ; images `object-cover`, `draggable={false}`, `loading="lazy"`, fond `bg-bg-elevated` pendant le chargement ; erreur de chargement → vignette grise + bouton « Réessayer » (re-render avec `?retry=n` non nécessaire : appeler `onImageError` fourni par l'appelant).
- [ ] **Step 4:** Commit `feat(photos): comparateur côte à côte, rideau, fondu`.

### Task 4: Écran Photos + navigation + ménage

**Files:** Create `src/screens/PhotosScreen.jsx`, `src/components/photos/PhotoTimeline.jsx`, `src/components/photos/PhotoOptionsSheet.jsx`. Modify `src/BottomNav.jsx`, `src/App.jsx`, `src/screens/DashboardScreen.jsx`, `src/screens/LogScreen.jsx`/`src/components/EntryCard.jsx` (bouton photo). Delete `src/components/ProgressCompare.jsx`, `src/components/PhotoActionSheet.jsx`, `src/components/PhotoCompareModal.jsx` ; supprimer les exports `@deprecated` de Task 1 devenus inutilisés.

**Interfaces — Consumes:** Task 1 (toutes), Task 3 (`PhotoComparer`, `CompareModeSwitch`). **Produces:** `PhotosScreen({ entries, settings, photosByDate, isSupabaseConfigured, focusDate, onAddPhoto(date), onReplacePhoto(date), onDeletePhoto(date), onViewPhoto(item), onRecropPhoto(item), onShare(pair, stats), onPlay() })`.

- [ ] **Step 1:** Onglet `photos` (libellé « Photos », icône appareil photo SVG `currentColor`) entre Journal et Progrès ; 5 onglets tiennent à 390 px.
- [ ] **Step 2:** `PhotosScreen` dans l'ordre du spec : pastilles raccourcis (`availableShortcuts`, désactivées grisées avec `title="Pas assez de photos"`), `CompareModeSwitch` (mode en localStorage `wt_compare_mode`, try/catch), `PhotoComparer`, bandeau « −5,2 kg · 46 jours » (`pairStats`, `goalIsLoss = settings.targetWeight < poids de départ du défi` via `resolveChallengeStart`), pastilles « Avant / Après » (slot actif), `PhotoTimeline` (groupée par mois, vignettes ≥ 44 px, poids sous chaque vignette, sélection visible, défilement horizontal, auto-scroll sur la sélection), bouton principal « Photo du jour » / « Remplacer la photo du jour », secondaires « Partager » et « Défilé ».
- [ ] **Step 3:** `PhotoOptionsSheet` (bouton « … » sur la vignette sélectionnée) : Voir en grand (`PhotoViewerModal` sans bouton Comparer), Recadrer, Remplacer, Supprimer (via `ConfirmSheet`, tone danger).
- [ ] **Step 4:** États du spec : 0 photo, 1 photo, Supabase absent (texte exact des Global Constraints), squelettes pendant le chargement.
- [ ] **Step 5:** Journal : le bouton photo d'une pesée → `setTab('photos')` + `focusDate = entry.date` ; si photo → `pairForJournalDate`, sinon ouverture de l'ajout guidé (Task 5) pour cette date. Aria-labels existants conservés.
- [ ] **Step 6:** Retirer `ProgressCompare` du dashboard et les modales supprimées d'`App.jsx` ; `grep -rn "ProgressCompare\|PhotoActionSheet\|PhotoCompareModal\|buildComparePairs" src` → vide.
- [ ] **Step 7:** Playwright 390×844 (photos simulées : `wt_photos:testuser` avec `url` en data-URL PNG générées, `isSupabaseConfigured` mocké si nécessaire — documenter la méthode) : états 0/1/4 photos, raccourcis, sélection avant/après avec échange, rideau glissé, captures dans `/tmp/claude-0/photos/`.
- [ ] **Step 8:** Commit `feat(photos): onglet Photos, frise et ménage des anciens chemins`.

### Task 5: Ajout guidé avec calque fantôme

**Files:** Modify `src/components/PhotoCropModal.jsx`, `src/hooks/usePhotoCrop.js` si besoin ; Create `src/components/photos/AddPhotoFlow.jsx` ; Modify `src/App.jsx`, `src/components/AddWeightModal.jsx`.

**Interfaces — Consumes:** `ghostFor` (Task 1), `uploadDailyPhoto(date, blob)` (useSync). **Produces:** `<PhotoCropModal isOpen imageUrl ghostUrl onClose onConfirm />` ; `<AddPhotoFlow open date onClose onSaved />`.

- [ ] **Step 1:** `PhotoCropModal` : si `ghostUrl`, image fantôme absolument positionnée sur la zone de recadrage 9:16 à 35 % d'opacité, `pointer-events-none` ; interrupteur « Guide » (défaut activé) ; texte d'aide « Cale-toi sur la photo précédente ».
- [ ] **Step 2:** `AddPhotoFlow` : boutons « Appareil photo » (`<input type="file" accept="image/*" capture="environment">`) et « Bibliothèque » (`accept=PHOTO_LIBRARY_ACCEPT`), puis cadrage avec `ghostUrl = ghostFor(photos, date)?.url`, puis `uploadDailyPhoto` ; toast succès « Photo enregistrée » / erreur.
- [ ] **Step 3:** Brancher : « Photo du jour », « Remplacer », « Recadrer » (repart de l'URL existante via `openCropFromUrl`), Journal sans photo, et la photo optionnelle d'`AddWeightModal` (même cadrage avec fantôme).
- [ ] **Step 4:** Playwright : ouverture du cadrage avec fantôme visible (opacité calculée ≈ 0.35) et interrupteur qui le masque.
- [ ] **Step 5:** Commit `feat(photos): prise guidée avec calque fantôme`.

### Task 6: Partager l'avant/après

**Files:** Create `src/utils/shareImage.js` (+ `src/utils/shareImage.test.js` pour la partie pure), `src/utils/fetchImage.js` (+ test).

**Interfaces — Produces:**
- `fetchWithRetry(url, { fetchFn, onExpired }) -> Promise<Blob>` — si réponse 403/400, appelle `await onExpired()` (qui retourne la nouvelle URL) puis 1 seule nouvelle tentative ; sinon lève.
- `shareLayout({ width: 1080, height: 960 }) -> { before: Rect, after: Rect, caption: Rect }` (pure, testée : deux images 9:16 côte à côte centrées, légende en bas).
- `composeShareImage({ beforeBlob, afterBlob, beforeLabel, afterLabel, caption }) -> Promise<Blob>` (canvas, PNG) ; légende du type « −5,2 kg en 46 jours » + « Suivi de poids ».
- Partage : `navigator.canShare?.({ files })` → `navigator.share`, sinon téléchargement `avant-apres-<date>.png`.

- [ ] **Step 1:** Tests : `fetchWithRetry` (200 → blob ; 403 puis 200 → onExpired appelé 1 fois ; 403 puis 403 → rejette ; 500 → rejette sans onExpired) avec `fetchFn` simulé ; `shareLayout` (rects dans les bornes, ratio 9:16 ±1 px, pas de chevauchement).
- [ ] **Step 2:** RED → implémenter → GREEN ; brancher le bouton « Partager » (désactivé si after null) ; `onExpired` = `reload()` de useSync puis relecture de l'URL depuis `getPhotoForDate`.
- [ ] **Step 3:** Commit `feat(photos): partager une image avant/après`.

### Task 7: Défilé

**Files:** Create `src/components/photos/PhotoTimelapse.jsx`.

- [ ] **Step 1:** Plein écran (overlay `role="dialog"`), photos chronologiques, 4 images/s, boutons Lecture/Pause (≥ 44 px), curseur de position, date + poids en surimpression, fermeture Échap/bouton ; préchargement des images ; `prefers-reduced-motion` → pas de lecture auto, flèches précédent/suivant.
- [ ] **Step 2:** Brancher le bouton « Défilé » (désactivé si < 2 photos).
- [ ] **Step 3:** Playwright : ouverture, lecture avance l'index, réduction de mouvement → pas d'auto-avance.
- [ ] **Step 4:** Commit `feat(photos): défilé des photos`.

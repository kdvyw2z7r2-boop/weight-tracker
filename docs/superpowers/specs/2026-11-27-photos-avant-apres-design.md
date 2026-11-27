# Photos avant/après — conception

## Intention
L'utilisateur trouve l'usage des photos confus (« ça va dans tous les sens ») et la comparaison avant/après inadaptée. Il veut un moyen **logique et fluide** de voir sa transformation. Il prend **une photo par jour** (pas de multi-poses) et a délégué les choix de conception (« logique, une photo, propose un plan » → option A retenue).

Succès = en 2 gestes il voit « avant » contre « après » au même cadrage, avec les kilos perdus et le temps écoulé, et il peut changer librement les deux dates.

## Objectifs
1. Un **lieu unique** pour les photos : un onglet « Photos ».
2. Une **comparaison vraie** : n'importe quelles deux dates, trois modes de vue, chiffres associés.
3. Des **photos comparables** : aide au cadrage par superposition de la photo précédente.
4. Moins de chemins : supprimer les entrées redondantes.

## Non-objectifs
- Plusieurs photos ou plusieurs poses par jour.
- Mesures corporelles, IA de détection de silhouette, alignement automatique.
- Refonte visuelle globale de l'app (chantier 2 séparé, sur maquettes).
- Changement du stockage (Supabase Storage, 1 fichier `userId/date.webp`, 720×1280 WebP) ou du schéma.

## Anti-objectifs (échec même si « ça marche »)
- Ajouter un écran de plus sans retirer les anciens chemins.
- Une comparaison qui exige des photos prises à des dates précises (le bloc J7/J30/J60 actuel est souvent vide).
- Forcer une photo pour enregistrer une pesée.

## Contraintes
- PWA React 19 / Vite / Tailwind 4, mobile d'abord (390 px), français, tokens couleur (pas de hex en dur dans components/screens), cibles ≥ 44 px, `prefers-reduced-motion` respecté.
- Photos disponibles seulement si Supabase est configuré ; sinon l'onglet affiche un état explicatif (pas de message technique).
- URLs signées (7 j) déjà gérées par `useSync` (`photosByDate`, `uploadDailyPhoto`, `deleteDailyPhoto`, `getPhotoForDate`).
- Pas de nouvelle dépendance lourde ; `react-easy-crop` existe déjà.

## Approches considérées
- **A — Onglet Photos dédié (retenue)** : frise + comparateur (côte à côte / rideau / fondu) + prise guidée + raccourcis. Résout le fouillis à la racine ; plus de travail.
- **B — Améliorer la modale actuelle** (choix libre des dates + rideau) : rapide mais garde 4 entrées éparpillées → contraire à l'objectif 1.
- **C — Défilé (timelapse) seul** : agréable mais ne permet pas de comparer finement deux dates ; gardé comme bonus dans A.

## Conception

### Navigation
- Nouvel onglet **Photos** dans la barre du bas, entre Journal et Progrès (5 onglets).
- Supprimés : bloc `ProgressCompare` du dashboard, `PhotoCompareModal`, bouton « Comparer avant / après » des feuilles photo.
- Le bouton photo d'une pesée du Journal ouvre l'onglet Photos centré sur ce jour (photo existante → la sélectionne comme « après » ; absente → lance l'ajout guidé pour ce jour).

### Écran Photos (haut → bas)
1. **Raccourcis** (pastilles) : « Départ → Aujourd'hui » (défaut), « 30 jours », « 7 jours ». Chaque raccourci choisit la photo **la plus proche** de la date cible (avant = plus proche de aujourd'hui − N jours ; après = la plus récente). « Départ » = première photo à partir de la date de départ du défi si défini, sinon première photo.
2. **Comparateur** (ratio 9:16, pleine largeur, hauteur bornée pour tenir à l'écran avec la frise visible) :
   - **Côte à côte** (défaut) : deux colonnes, étiquettes « Avant · 12 oct. » / « Après · 27 nov. ».
   - **Rideau** : l'après au-dessus, révélé par une poignée verticale glissable (pointer events, clavier ←/→ pour l'accessibilité).
   - **Fondu** : curseur 0–100 % d'opacité de l'après sur l'avant.
   - Sélecteur segmenté des 3 modes ; mode mémorisé (localStorage).
3. **Bandeau chiffres** : « −5,2 kg · 46 jours » (poids de la pesée du jour de chaque photo, sinon « — » ; signe et couleur verte/rouge selon le sens de l'objectif).
4. **Frise** : vignettes défilant horizontalement (plus récentes à droite), regroupées par mois, poids sous chaque vignette. Touche une vignette → elle devient la date **active** (avant ou après selon le slot sélectionné ; deux pastilles « Avant / Après » au-dessus de la frise indiquent quel slot on modifie). Appui long ou bouton « … » → feuille : Voir en grand, Recadrer, Remplacer, Supprimer (confirmation).
5. **Actions** : bouton principal « Photo du jour » (ou « Remplacer la photo du jour » si elle existe) ; secondaire « Partager » (image composée avant/après) et « Défilé ».

### Ajout guidé
- Choix de la source : appareil photo ou bibliothèque (input fichier, `PHOTO_LIBRARY_ACCEPT`).
- Étape **Cadrer** (réutilise `react-easy-crop`, ratio 9:16) avec **calque fantôme** : la photo la plus récente précédant la date, affichée à ~35 % d'opacité au-dessus de la zone de recadrage ; interrupteur « Guide » pour le masquer. L'utilisateur déplace/zoome sa photo pour se caler sur le fantôme.
- Pas de caméra intégrée en direct dans cette itération (le recadrage sur fantôme couvre l'alignement partout, iOS compris).
- Date par défaut = aujourd'hui ; depuis le Journal = date de la pesée.

### Pesée et photo découplées
- `AddWeightModal` n'exige plus de photo (le blocage `photoRequired` disparaît) ; on peut toujours en joindre une (même flux de cadrage avec fantôme).
- Une photo peut exister un jour sans pesée (bandeau chiffres affiche « — » pour le poids manquant).

### Partager
- Compose côté client (canvas) une image 1080×960 : avant | après, dates, « −5,2 kg en 46 jours », discret nom de l'app. `navigator.share` avec fichier si disponible, sinon téléchargement.

### Défilé
- Lecture plein écran des photos dans l'ordre chronologique (≈ 4 images/s, pause/lecture, curseur), date et poids en surimpression. Avec `prefers-reduced-motion` : pas de lecture auto, navigation manuelle.

### États
- 0 photo : illustration + « Ajoute ta première photo pour suivre ta transformation » + bouton.
- 1 photo : comparateur montre la photo seule côté avant, l'après vide invite à « Reviens dans quelques jours ».
- Supabase absent : « Les photos nécessitent la connexion au cloud. » sans détail technique.
- Chargement des URLs signées : squelettes ; erreur de chargement d'une image : vignette grise + réessayer.

## Décisions de détail (choix du concepteur, à contester si besoin)
1. **Feuilles photo** : `PhotoActionSheet` et `PhotoCompareModal` sont supprimés ; leurs actions (Voir en grand, Recadrer, Remplacer, Supprimer) vivent dans la feuille « … » de la frise. `PhotoViewerModal` est réutilisé pour « Voir en grand » (sans bouton Comparer). `PhotoCropModal` est réutilisé et reçoit le calque fantôme.
2. **Ordre des dates** : l'avant est toujours antérieur à l'après. Si une sélection inverse l'ordre, les deux slots s'échangent automatiquement. Même photo dans les deux slots interdite (le slot touché prend la photo, l'autre bascule sur la plus proche différente). Lien depuis le Journal : la photo du jour devient « après » ; l'avant garde sa valeur s'il est antérieur, sinon il passe à la première photo.
3. **Raccourcis** : « photo la plus proche » = plus petit écart en jours ; égalité → la plus ancienne. Si l'avant obtenu est la même photo que l'après (trop peu de photos), le raccourci est désactivé (grisé) avec l'infobulle « Pas assez de photos ». Les raccourcis 30 j / 7 j ne s'affichent qu'avec ≥ 2 photos.
4. **Chiffres** : poids d'une photo = pesée du même jour, sinon la pesée la plus proche à ± 3 jours, sinon « — ». Si l'un des deux manque, le delta kg est « — » (les jours restent affichés). Unité = `settings.unit`, formatage `formatWeight`. Vert si l'écart va dans le sens de l'objectif (cible < poids de départ du défi → baisse = vert), rouge sinon.
5. **Sans Supabase** : aucune photo ne peut exister (l'envoi exige Supabase ; le cache local ne contient que des chemins Storage). L'onglet reste visible avec l'état explicatif.
6. **Partage/défilé** : les images sont récupérées via `fetch(url)` → `Blob` → `createImageBitmap` (le Storage Supabase sert les URLs signées avec CORS ouvert), donc canvas non « tainted ». URL expirée (403) → `useSync.reload()` silencieux puis une nouvelle tentative.
7. **Fantôme lors d'un remplacement** : on affiche la photo **remplacée** (même date) si elle existe, sinon la plus récente antérieure.

## Laissé au constructeur
- Découpage en composants et hooks ; la logique pure (sélection par raccourci, photo la plus proche, delta kg/jours, regroupement par mois) va dans `src/utils/progressPhotos.js` avec tests Vitest.
- Détails d'animation, tailles exactes des vignettes, style du rideau dans la palette actuelle (la refonte visuelle viendra après).

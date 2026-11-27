# Mensurations, objectifs & badges, bilan hebdo — conception

## Intention
L'utilisateur veut que l'app « gagne en fonctionnalités » ; il a choisi : **mensurations**, **objectifs & badges**, **bilan hebdo**, et a délégué les choix (« go pour tout », « accélère »). Objectif : plus de raisons d'ouvrir l'app et plus de motivation, sans complexifier l'usage quotidien (pesée + photo).

## Objectifs
1. **Mensurations** : saisir tour de taille, hanches, poitrine, bras, cuisse, cou (cm ; tous optionnels) à une date ; voir l'évolution de chacune et le cumul « −X cm » depuis le départ du défi.
2. **Objectifs & badges** : paliers automatiques motivants, célébration quand un palier est atteint, vitrine des badges.
3. **Bilan hebdo** : une carte claire résumant la semaine écoulée (lundi→dimanche), mise en avant le lundi.

## Non-objectifs
- Pas de nouvelle table Supabase, pas de notifications push, pas de partage social des badges (le partage avant/après existe déjà).
- Pas de saisie de mensurations à chaque pesée (rythme conseillé : hebdomadaire).

## Anti-objectifs
- Badges infantilisants ou inflation de badges (> 20) ; célébrations intrusives répétées.
- Perte de mensurations à la synchronisation multi-appareils.

## Décisions
### Données (aucun changement de schéma)
- `settings.measurements: { [id]: { id, date: 'yyyy-MM-dd', waist?, hips?, chest?, arm?, thigh?, neck?, updatedAt } }` — valeurs en cm (pas de conversion d'unité ; l'app affiche « cm » même en lbs).
- Fusion multi-appareils : union par id (le plus grand `updatedAt` gagne) dans `mergeSettings`, `mergeForSave`, `mergeForLoad` ; suppression via les marqueurs existants `deletedEntries/restoredEntries` (ids UUID uniques, partagés avec les pesées sans collision). Élagage des marqueurs inchangé.
- Badges : **calculés** à partir des pesées, photos, mensurations, défi ; seule la liste « déjà célébrés » est stockée (localStorage par appareil `wt_badges_seen:<userId>`), pour ne pas re-célébrer.

### Mensurations (UI)
- Accès : onglet **Progrès**, nouvelle section « Mensurations » (carte : total « −6,5 cm depuis le départ », mini-courbes par zone, dernière date) + bouton « Ajouter des mesures ».
- Feuille de saisie : date (défaut aujourd'hui), 6 champs `NumberField` (bornes 10–250 cm, 1 décimale), pré-remplis avec la dernière valeur en placeholder ; au moins un champ requis.
- Détail : liste des relevés (modifier / supprimer avec annulation comme les pesées).
- « Depuis le départ » = premier relevé à partir de `challengeStartDate` (sinon le premier) vs dernier, par zone ; total = somme des zones présentes dans les deux.

### Badges (catalogue fixe, 14)
- **Poids perdu** (depuis le départ du défi) : −1, −3, −5, −10, −15, −20 kg (en lbs : −2, −5, −10, −20, −30, −40).
- **Objectif** : 25 %, 50 %, 75 %, 100 % du chemin.
- **Régularité** (série de jours avec pesée) : 7, 30 jours.
- **Photos** : 10 photos.
- **Mensurations** : −5 cm cumulés.
- Chaque badge : id stable, titre, description, icône SVG simple (pas d'emoji), date d'obtention (première date où la condition est vraie, calculée).
- Célébration : à l'ouverture ou après une pesée, si un badge nouvellement obtenu n'est pas dans `seen` → feuille de célébration sobre (verre, icône, titre, « Continuer ») ; plusieurs nouveaux → une seule feuille listant tout ; respect de `prefers-reduced-motion`.
- Vitrine : section « Badges » dans Progrès (grille ; obtenus en couleur avec date, à venir en grisé avec progression « 3,2 / 5 kg »).

### Bilan hebdo
- Semaine = lundi→dimanche locale. Carte « Ta semaine » : moyenne de la semaine vs semaine précédente (delta), nombre de pesées /7, rythme vs plan (si plan), meilleure série, photo de la semaine (la plus récente) si présente, badges obtenus dans la semaine, variation mensurations si relevé dans la semaine.
- Emplacement : Dashboard, sous la carte héro ; le **lundi** (et jusqu'à ce que l'utilisateur la ferme) elle affiche la **semaine écoulée** avec un en-tête « Bilan de la semaine dernière » ; les autres jours, la **semaine en cours** (« Cette semaine »).
- Navigation : flèches semaine précédente/suivante (jusqu'à 12 semaines), état vide si aucune pesée.

## Approches considérées
- **Données dans le blob settings + calcul pur (retenue)** : zéro migration, synchro déjà fiable, tout testable en pur.
- Nouvelle table Supabase `measurements` : plus « propre » mais migration + RLS + chemin /api/sync à dupliquer ; refusé (non-objectif).
- Badges stockés côté serveur : inutile, ils sont dérivables.

## Laissé au constructeur
- Découpage composants, libellés secondaires, icônes SVG, style (doit suivre Liquid Glass : `GlassCard`, `SegmentedControl`, `GlassButton`, tokens).

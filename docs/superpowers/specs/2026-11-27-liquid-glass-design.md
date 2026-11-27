# Refonte visuelle « Liquid Glass sombre » — conception

## Intention
L'utilisateur trouve l'app moche au point de ne pas vouloir l'utiliser. Après comparaison de maquettes, il a validé la direction **« Liquid Glass sombre »** : fond sombre, matière verre translucide façon Apple (iOS « Liquid Glass »), finition premium inspirée d'Apple et Shazam, et au final plus proche des styles A (calme, lisible) et B (sobre, chiffres fins) que du style C. Référence visuelle validée : maquette « Liquid Glass » de https://claude.ai/artifact/UsJshEdUFZ7tH1UNiEZgWo.

Succès = l'app donne envie d'être ouverte ; chaque écran a l'air d'une app iOS premium, cohérente de bout en bout.

## Objectifs
1. Remplacer intégralement l'identité « electric rock » néon (cyan/violet saturés, glows, gradients flashy, titres en capitales néon) par la direction validée.
2. Une **bibliothèque de primitives** réutilisables pour que tous les écrans partagent la même matière.
3. Appliquer à **tous** les écrans et surfaces : Poids (dashboard), Journal, Photos, Progrès, Réglages, modales/feuilles (ajout pesée, plan, ConfirmSheet, options photo, recadrage, visionneuse, défilé), toasts, barre d'onglets, écran de chargement, tutoriel d'installation.

## Non-objectifs
- Changer les fonctionnalités, la navigation ou les données (sauf ajustements de mise en page nécessaires).
- Thème clair (l'app reste sombre uniquement).

## Anti-objectifs
- Néon, glow coloré, texte en dégradé, capitales criardes : tout cela disparaît.
- Effet verre qui nuit à la lisibilité (contraste < 4.5:1) ou qui fait ramer le téléphone (flou sur de grandes surfaces animées).

## Direction (valeurs de référence, reprises de la maquette validée)
- **Fond d'app** : `#05070f` avec halos radiaux fixes : bleu `#1a3a8f` (haut-gauche), bleu `#0b6cd8` (droite, ~35 %), violet `#3b1d8f` (bas). Fixés au viewport (pas recalculés au scroll).
- **Verre** : fond `linear-gradient(160deg, rgba(255,255,255,.14), rgba(255,255,255,.08) 45%, rgba(255,255,255,.04))`, bordure `1px rgba(255,255,255,.22)`, `backdrop-filter: blur(24px) saturate(160%)`, ombre `inset 0 1px 0 rgba(255,255,255,.35)` + ombre portée douce, reflet en haut (dégradé blanc 16 % → 0 sur la moitié supérieure). Rayons : 24 px (cartes), 18 px (petites cartes), 28 px (barre d'onglets), pilule (999 px) pour boutons/segments.
- **Texte** : primaire `#f5f7ff`, secondaire `rgba(235,240,255,.62)` (vérifier ≥ 4.5:1 sur le verre au-dessus du fond ; relever si besoin).
- **Couleurs sémantiques** : action/accent `#4aa3ff` ; bon sens `#5be0a8` ; série/badges `#ffb347` ; erreur/danger `#ff6b6b` (adouci) ; plan (courbe) violet doux `#a78bfa` ; moyenne 7 j `#5be0a8` ; objectif `#ffb347`.
- **Typo** : pile système Apple `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, system-ui, sans-serif` (SF sur iPhone, Inter ailleurs, déjà chargé). Grands chiffres : graisse 200 (hero) / 600 (stats), `letter-spacing` négatif, `tabular-nums`. Titres d'écran : 28 px, 700, casse normale (plus de MAJUSCULES néon).
- **Barre d'onglets** : capsule de verre flottante (marges 12 px, au-dessus du safe-area), onglet actif = pastille verre plus claire + icône accent.
- **Contrôles** : segmentés en verre (piste translucide, segment actif plus clair avec reflet) ; bouton principal plein accent `#4aa3ff` texte foncé ou verre teinté accent ; boutons secondaires en verre.
- **Graphiques** : lignes fines (2 px), grille très discrète, pas de glow ; anneau de progression accent sur piste `rgba(255,255,255,.12)`.
- **Mouvement** : transitions courtes et douces (opacité/échelle 0.98→1), pas de pulse/float ; `prefers-reduced-motion` coupe tout.
- **Performance** : `backdrop-filter` seulement sur les surfaces (cartes, barre, feuilles), jamais animé ; repli sans flou si `@supports not (backdrop-filter)` (verre opaque `rgba(30,36,56,.85)`).

## Approches considérées
- **Retokenisation + primitives (retenue)** : nouveaux tokens dans `index.css`, classes utilitaires `.glass`, `.glass-sm`, `.glass-pill`, composants `GlassCard`, `SegmentedControl`, `GlassButton`, puis passage écran par écran. Cohérent, maintenable, réutilise l'architecture tokens existante.
- **Simple changement de tokens** : rapide mais les classes néon (`card-electric`, `neon-text-*`, `badge-neon`, glows) restent → anti-objectif.
- **Réécriture complète des écrans** : risque de régression fonctionnelle, inutile.

## Laissé au constructeur
- Noms exacts des classes/composants, découpage des tâches par écran, ajustements de mise en page mineurs pour que le verre « respire ».
- Vérification visuelle par captures 390×844 de chaque écran et feuille.

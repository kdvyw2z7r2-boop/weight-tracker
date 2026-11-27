import { useCallback, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ConfirmSheet from "../components/ConfirmSheet";
import PhotoComparer from "../components/photos/PhotoComparer";
import PhotoOptionsSheet from "../components/photos/PhotoOptionsSheet";
import PhotoTimeline from "../components/photos/PhotoTimeline";
import GlassButton from "../components/ui/GlassButton";
import GlassCard from "../components/ui/GlassCard";
import SegmentedControl from "../components/ui/SegmentedControl";
import { resolveChallengeStart, todayIso } from "../utils/challenge";
import { formatDays, formatDelta } from "../utils/format";
import { formatDateCompact, formatDateEntry } from "../utils/locale";
import {
  availableShortcuts,
  defaultPair,
  listPhotos,
  pairForJournalDate,
  pairStats,
  selectForSlot,
  shortcutDisabledReason,
  shortcutPair,
} from "../utils/progressPhotos";

const MODE_STORAGE_KEY = "wt_compare_mode";
const MODE_OPTIONS = [
  { value: "side", label: "Côte à côte" },
  { value: "curtain", label: "Rideau" },
  { value: "fade", label: "Fondu" },
];
const MODES = MODE_OPTIONS.map((option) => option.value);

const SHORTCUTS = [
  { key: "start", label: "Départ → Aujourd’hui" },
  { key: "d30", label: "30 jours" },
  { key: "d7", label: "7 jours" },
];

// Hauteur du comparateur bornée pour garder la frise à l'écran. Rideau/fondu : pas de rangée
// de pastilles Avant/Après (les étiquettes du cadre en tiennent lieu) ni de curseur sous le cadre,
// d'où un cadre plus haut (≈ 315 px, soit 177 px de large, à 390×844).
const SIDE_HEIGHT = "calc(100svh - 585px)";
const SINGLE_HEIGHT = "calc(100svh - 529px)";
const COMPARER_STYLE = {
  side: { maxWidth: `clamp(280px, calc(${SIDE_HEIGHT} * 1.125 + 24px), 100%)` },
  single: { maxWidth: `clamp(176px, calc(${SINGLE_HEIGHT} * 0.5625 + 16px), 331px)` },
};

function readMode() {
  try {
    const stored = window.localStorage.getItem(MODE_STORAGE_KEY);
    return MODES.includes(stored) ? stored : "side";
  } catch {
    return "side";
  }
}

function storeMode(mode) {
  try {
    window.localStorage.setItem(MODE_STORAGE_KEY, mode);
  } catch {
    // stockage indisponible (navigation privée…) : le mode reste en mémoire
  }
}

const toSelection = (pair) =>
  pair ? { before: pair.before.date, after: pair.after?.date ?? null } : null;

/** Sélection mémorisée (dates) -> paire, ou null si une des dates n'existe plus. */
function resolveSelection(photos, selection) {
  if (!selection) return null;
  const before = photos.find((p) => p.date === selection.before);
  if (!before) return null;
  if (selection.after == null)
    return photos.length >= 2 ? null : { before, after: null };
  const after = photos.find((p) => p.date === selection.after);
  return after ? { before, after } : null;
}

const samePair = (a, b) =>
  Boolean(a && b) &&
  a.before.date === b.before.date &&
  (a.after?.date ?? null) === (b.after?.date ?? null);

function Header({ children = null }) {
  return (
    <div className="space-y-3">
      <h2 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-text-primary">
        Photos
      </h2>
      {children}
    </div>
  );
}

function CameraIllustration() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-8 w-8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path
        d="M4 8h3l1.5-2h7L17 8h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function PhotosScreen({
  entries,
  settings,
  photosByDate,
  isSupabaseConfigured,
  focusDate = null,
  onAddPhoto,
  onReplacePhoto,
  onDeletePhoto,
  onViewPhoto,
  onRecropPhoto,
  onShare,
  onPlay,
  sharing = false,
  sharePendingKey = null,
  refreshing = false,
  onRefreshUrls,
}) {
  const today = todayIso();
  const unit = settings.unit;
  const photos = useMemo(
    () => listPhotos(photosByDate, entries),
    [photosByDate, entries],
  );
  const ctx = useMemo(
    () => ({ today, challengeStartDate: settings.challengeStartDate ?? null }),
    [today, settings.challengeStartDate],
  );

  const [mode, setMode] = useState(readMode);
  const [selection, setSelection] = useState(null);
  const [activeSlot, setActiveSlot] = useState("after");
  const [appliedFocus, setAppliedFocus] = useState(null);
  const [optionsPhoto, setOptionsPhoto] = useState(null);
  const [deletePhoto, setDeletePhoto] = useState(null);

  // Jamais vide s'il y a des photos (ex. défi réinitialisé aujourd'hui : « Départ » indisponible).
  const pair =
    resolveSelection(photos, selection) ?? defaultPair(photos, ctx);

  // Lien depuis le Journal (ou photo ajoutée pour une date) : appliqué une fois, dès que la photo existe.
  if (
    focusDate &&
    focusDate !== appliedFocus &&
    photos.some((p) => p.date === focusDate)
  ) {
    const next = pairForJournalDate(photos, focusDate, pair);
    setAppliedFocus(focusDate);
    setSelection(toSelection(next));
    setActiveSlot(next.after?.date === focusDate ? "after" : "before");
  }

  const shortcuts = useMemo(
    () => availableShortcuts(photos, ctx),
    [photos, ctx],
  );

  const goalIsLoss = useMemo(() => {
    const startWeight =
      resolveChallengeStart(settings, entries)?.startWeight ??
      entries[0]?.weight;
    if (settings.targetWeight == null || startWeight == null) return true;
    return settings.targetWeight < startWeight;
  }, [settings, entries]);

  const stats = pair ? pairStats(pair, { goalIsLoss }) : null;

  const changeMode = useCallback((next) => {
    setMode(next);
    storeMode(next);
  }, []);

  const applyShortcut = (key) => {
    const next = shortcutPair(photos, key, ctx);
    if (next) setSelection(toSelection(next));
  };

  const handleSelect = (photo) => {
    const base = pair ?? defaultPair(photos, ctx);
    if (!base) return;
    const next = selectForSlot(base, activeSlot, photo, photos);
    setSelection(toSelection(next));
    if (next.before?.date === photo.date) setActiveSlot("before");
    else if (next.after?.date === photo.date) setActiveSlot("after");
  };

  // Image en échec (URL signée sans doute expirée) : une seule re-signature par photo
  // (clé storagePath : une nouvelle URL encore en échec ne relance pas de boucle).
  const refreshedPathsRef = useRef(new Set());
  const handleImageError = useCallback(
    (photo) => {
      const key = photo?.storagePath ?? photo?.url;
      if (!photo?.url || !key || refreshing || refreshedPathsRef.current.has(key))
        return;
      refreshedPathsRef.current.add(key);
      onRefreshUrls?.();
    },
    [onRefreshUrls, refreshing],
  );

  const closeOptions = useCallback(() => setOptionsPhoto(null), []);
  const reasonId = useId();
  const cancelDelete = useCallback(() => setDeletePhoto(null), []);

  if (!isSupabaseConfigured) {
    return (
      <section className="space-y-4">
        <Header />
        <GlassCard className="animate-fade-up flex flex-col items-center px-5 py-12 text-center">
          <div className="empty-state-icon mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-text-secondary">
            <CameraIllustration />
          </div>
          <p className="max-w-[260px] text-[15px] leading-relaxed text-text-primary">
            Les photos nécessitent la connexion au cloud.
          </p>
        </GlassCard>
      </section>
    );
  }

  const hasTodayPhoto = photos.some((p) => p.date === today);

  if (!photos.length) {
    return (
      <section className="space-y-4">
        <Header />
        <GlassCard className="animate-fade-up flex flex-col items-center px-5 py-12 text-center">
          <div className="empty-state-icon mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-text-secondary">
            <CameraIllustration />
          </div>
          <p className="max-w-[260px] text-[15px] font-medium leading-relaxed text-text-primary">
            Ajoute ta première photo pour suivre ta transformation
          </p>
          <GlassButton
            size="lg"
            onClick={() => onAddPhoto?.(today)}
            className="mt-6"
          >
            Photo du jour
          </GlassButton>
        </GlassCard>
      </section>
    );
  }

  const visibleShortcuts = SHORTCUTS.filter(
    (s) => s.key === "start" || photos.length >= 2,
  );
  const showSlots = photos.length >= 2 && pair?.after;
  const singleFrame = Boolean(pair?.after) && mode !== "side";
  const slots = showSlots
    ? { active: activeSlot, onChange: setActiveSlot }
    : undefined;
  const statsTone =
    stats?.isGood === true
      ? "text-good"
      : stats?.isGood === false
        ? "text-danger"
        : "text-text-primary";
  const disabledReasons = [
    ...new Set(
      visibleShortcuts
        .filter((shortcut) => !shortcuts[shortcut.key])
        .map((shortcut) => shortcutDisabledReason(photos, shortcut.key, ctx))
        .filter(Boolean),
    ),
  ];

  return (
    <section className="space-y-3" aria-busy={refreshing}>
      <Header>
        {pair?.after ? (
          <SegmentedControl
            options={MODE_OPTIONS}
            value={mode}
            onChange={changeMode}
            ariaLabel="Mode de comparaison"
          />
        ) : null}
      </Header>

      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Raccourcis de comparaison"
        aria-describedby={disabledReasons.length ? reasonId : undefined}
      >
        {visibleShortcuts.map((shortcut) => {
          const enabled = shortcuts[shortcut.key];
          const active =
            enabled && samePair(pair, shortcutPair(photos, shortcut.key, ctx));
          return (
            <button
              key={shortcut.key}
              type="button"
              disabled={!enabled}
              title={
                enabled
                  ? undefined
                  : shortcutDisabledReason(photos, shortcut.key, ctx)
              }
              aria-pressed={active}
              onClick={() => applyShortcut(shortcut.key)}
              className={`press-button glass-pill min-h-[44px] px-4 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-45 ${
                active ? "glass-pill-active" : "text-text-secondary"
              }`}
            >
              {shortcut.label}
            </button>
          );
        })}
      </div>
      {disabledReasons.length ? (
        <p id={reasonId} className="-mt-1 text-[12px] text-text-secondary">
          {disabledReasons.join(" · ")}
        </p>
      ) : null}

      {pair ? (
        <GlassCard
          className="mx-auto w-full p-2"
          style={singleFrame ? COMPARER_STYLE.single : COMPARER_STYLE.side}
        >
          <PhotoComparer
            before={pair.before}
            after={pair.after}
            mode={mode}
            slots={singleFrame ? slots : undefined}
            onImageError={handleImageError}
            onRetryUrl={refreshing ? undefined : onRefreshUrls}
          />
        </GlassCard>
      ) : null}

      {stats && pair?.after ? (
        <p
          className="text-center text-[17px] font-semibold tracking-[-0.01em] tabular-nums"
          aria-live="polite"
        >
          <span className={statsTone}>{formatDelta(stats.delta, unit)}</span>
          <span className="text-text-tertiary"> · </span>
          <span className="text-text-primary">{formatDays(stats.days)}</span>
        </p>
      ) : null}

      {showSlots && !singleFrame ? (
        <SegmentedControl
          ariaLabel="Photo à modifier"
          value={activeSlot}
          onChange={setActiveSlot}
          options={[
            {
              value: "before",
              label: `Avant · ${formatDateCompact(pair.before.date)}`,
            },
            {
              value: "after",
              label: `Après · ${formatDateCompact(pair.after.date)}`,
            },
          ]}
        />
      ) : null}

      <PhotoTimeline
        photos={photos}
        pair={pair}
        activeSlot={showSlots ? activeSlot : "before"}
        onSelect={handleSelect}
        onOptions={setOptionsPhoto}
        onRetryUrl={refreshing ? undefined : onRefreshUrls}
        onImageError={handleImageError}
      />

      <div className="space-y-2 pt-1">
        <GlassButton
          size="lg"
          onClick={() =>
            hasTodayPhoto ? onReplacePhoto?.(today) : onAddPhoto?.(today)
          }
          className="w-full"
        >
          {hasTodayPhoto ? "Remplacer la photo du jour" : "Photo du jour"}
        </GlassButton>
        {onShare || onPlay ? (
          <div className="flex gap-2">
            {onShare ? (
              <GlassButton
                variant="secondary"
                onClick={() => onShare(pair, stats)}
                disabled={!pair?.after || sharing}
                aria-busy={sharing}
                className="flex-1"
              >
                {sharing
                  ? "Préparation…"
                  : pair?.after &&
                      sharePendingKey ===
                        `${pair.before.date}|${pair.after.date}`
                    ? "Envoyer l’image"
                    : "Partager"}
              </GlassButton>
            ) : null}
            {onPlay ? (
              <GlassButton
                variant="secondary"
                onClick={() => onPlay()}
                disabled={photos.length < 2}
                className="flex-1"
              >
                {photos.length < 2 ? "Défilé · 2 photos min." : "Défilé"}
              </GlassButton>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Portail : au-dessus de la barre de navigation (hors du contexte d'empilement de <main>). */}
      {createPortal(
        <>
          <PhotoOptionsSheet
            open={Boolean(optionsPhoto)}
            photo={optionsPhoto}
            unit={unit}
            onClose={closeOptions}
            onView={(photo) => {
              setOptionsPhoto(null);
              onViewPhoto?.(photo);
            }}
            onRecrop={(photo) => {
              setOptionsPhoto(null);
              onRecropPhoto?.(photo);
            }}
            onReplace={(photo) => {
              setOptionsPhoto(null);
              onReplacePhoto?.(photo.date);
            }}
            onDelete={(photo) => {
              setOptionsPhoto(null);
              setDeletePhoto(photo);
            }}
          />
          <ConfirmSheet
            open={Boolean(deletePhoto)}
            title="Supprimer la photo ?"
            message={
              deletePhoto
                ? `La photo du ${formatDateEntry(deletePhoto.date)} sera définitivement supprimée.`
                : ""
            }
            confirmLabel="Supprimer"
            tone="danger"
            onCancel={cancelDelete}
            onConfirm={() => {
              const target = deletePhoto;
              setDeletePhoto(null);
              if (target) onDeletePhoto?.(target.date);
            }}
          />
        </>,
        document.body,
      )}
    </section>
  );
}

export default PhotosScreen;

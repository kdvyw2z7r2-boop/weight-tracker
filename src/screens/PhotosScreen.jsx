import { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import ConfirmSheet from "../components/ConfirmSheet";
import CompareModeSwitch from "../components/photos/CompareModeSwitch";
import PhotoComparer from "../components/photos/PhotoComparer";
import PhotoOptionsSheet from "../components/photos/PhotoOptionsSheet";
import PhotoTimeline from "../components/photos/PhotoTimeline";
import { resolveChallengeStart, todayIso } from "../utils/challenge";
import { formatDays, formatDelta } from "../utils/format";
import { formatDateCompact, formatDateEntry } from "../utils/locale";
import {
  availableShortcuts,
  listPhotos,
  pairForJournalDate,
  pairStats,
  selectForSlot,
  shortcutPair,
} from "../utils/progressPhotos";

const MODE_STORAGE_KEY = "wt_compare_mode";
const MODES = ["side", "curtain", "fade"];

const SHORTCUTS = [
  { key: "start", label: "Départ → Aujourd’hui" },
  { key: "d30", label: "30 jours" },
  { key: "d7", label: "7 jours" },
];

// Hauteur du comparateur bornée pour garder la frise à l'écran (≈ 287 px de haut à 844 px).
const FRAME_HEIGHT = "calc(100svh - 557px)";
const COMPARER_STYLE = {
  side: { maxWidth: `clamp(280px, calc(${FRAME_HEIGHT} * 1.125 + 8px), 100%)` },
  single: { maxWidth: `clamp(160px, calc(${FRAME_HEIGHT} * 0.5625), 315px)` },
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

function Header() {
  return (
    <h2 className="animate-fade-up text-[20px] font-black uppercase tracking-tight neon-text-cyan">
      Photos
    </h2>
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

  const pair =
    resolveSelection(photos, selection) ?? shortcutPair(photos, "start", ctx);

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
    if (!pair) return;
    const next = selectForSlot(pair, activeSlot, photo, photos);
    setSelection(toSelection(next));
    if (next.before?.date === photo.date) setActiveSlot("before");
    else if (next.after?.date === photo.date) setActiveSlot("after");
  };

  const closeOptions = useCallback(() => setOptionsPhoto(null), []);
  const cancelDelete = useCallback(() => setDeletePhoto(null), []);

  if (!isSupabaseConfigured) {
    return (
      <section className="space-y-4">
        <Header />
        <div className="card-base animate-fade-up flex flex-col items-center py-12 text-center">
          <div className="empty-state-icon mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-text-secondary">
            <CameraIllustration />
          </div>
          <p className="max-w-[260px] text-[15px] leading-relaxed text-text-primary">
            Les photos nécessitent la connexion au cloud.
          </p>
        </div>
      </section>
    );
  }

  const hasTodayPhoto = photos.some((p) => p.date === today);

  if (!photos.length) {
    return (
      <section className="space-y-4">
        <Header />
        <div className="card-base animate-fade-up flex flex-col items-center py-12 text-center">
          <div className="empty-state-icon animate-float mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-text-secondary">
            <CameraIllustration />
          </div>
          <p className="max-w-[260px] text-[15px] font-medium leading-relaxed text-text-primary">
            Ajoute ta première photo pour suivre ta transformation
          </p>
          <button
            type="button"
            onClick={() => onAddPhoto?.(today)}
            className="btn-primary mt-6 h-12 px-6 text-[15px]"
          >
            Photo du jour
          </button>
        </div>
      </section>
    );
  }

  const visibleShortcuts = SHORTCUTS.filter(
    (s) => s.key === "start" || photos.length >= 2,
  );
  const showSlots = photos.length >= 2 && pair?.after;
  const statsTone =
    stats?.isGood === true
      ? "text-accent-green"
      : stats?.isGood === false
        ? "text-accent-red"
        : "text-text-primary";

  return (
    <section className="space-y-3" aria-busy={refreshing}>
      <Header />

      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Raccourcis de comparaison"
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
              title={enabled ? undefined : "Pas assez de photos"}
              aria-pressed={active}
              onClick={() => applyShortcut(shortcut.key)}
              className={`press-button min-h-[44px] rounded-full px-4 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
                active
                  ? "bg-white text-black"
                  : "bg-bg-elevated text-text-secondary"
              }`}
            >
              {shortcut.label}
            </button>
          );
        })}
      </div>

      {pair?.after ? (
        <div className="flex justify-center">
          <CompareModeSwitch value={mode} onChange={changeMode} />
        </div>
      ) : null}

      {pair ? (
        <div
          className="mx-auto w-full"
          style={
            pair.after && mode !== "side"
              ? COMPARER_STYLE.single
              : COMPARER_STYLE.side
          }
        >
          <PhotoComparer
            before={pair.before}
            after={pair.after}
            mode={mode}
            onRetryUrl={refreshing ? undefined : onRefreshUrls}
          />
        </div>
      ) : null}

      {stats && pair?.after ? (
        <p
          className="text-center text-[17px] font-bold tabular-nums"
          aria-live="polite"
        >
          <span className={statsTone}>{formatDelta(stats.delta, unit)}</span>
          <span className="text-text-tertiary"> · </span>
          <span className="text-text-primary">{formatDays(stats.days)}</span>
        </p>
      ) : null}

      {showSlots ? (
        <div
          role="radiogroup"
          aria-label="Photo à modifier"
          className="grid grid-cols-2 gap-2"
        >
          {[
            {
              key: "before",
              label: "Avant",
              photo: pair.before,
              tone: "bg-accent-blue text-bg-primary",
            },
            {
              key: "after",
              label: "Après",
              photo: pair.after,
              tone: "bg-accent-purple text-white",
            },
          ].map((slot) => {
            const active = activeSlot === slot.key;
            return (
              <button
                key={slot.key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setActiveSlot(slot.key)}
                className={`press-button min-h-[44px] rounded-full px-3 text-[13px] font-semibold ${
                  active ? slot.tone : "bg-bg-elevated text-text-secondary"
                }`}
              >
                {slot.label} · {formatDateCompact(slot.photo.date)}
              </button>
            );
          })}
        </div>
      ) : null}

      <PhotoTimeline
        photos={photos}
        pair={pair}
        activeSlot={showSlots ? activeSlot : "before"}
        onSelect={handleSelect}
        onOptions={setOptionsPhoto}
        onRetryUrl={refreshing ? undefined : onRefreshUrls}
      />

      <div className="space-y-2 pt-1">
        <button
          type="button"
          onClick={() =>
            hasTodayPhoto ? onReplacePhoto?.(today) : onAddPhoto?.(today)
          }
          className="btn-primary h-12 w-full text-[15px]"
        >
          {hasTodayPhoto ? "Remplacer la photo du jour" : "Photo du jour"}
        </button>
        {onShare || onPlay ? (
          <div className="flex gap-2">
            {onShare ? (
              <button
                type="button"
                onClick={() => onShare(pair, stats)}
                disabled={!pair?.after || sharing}
                aria-busy={sharing}
                className="press-button h-11 flex-1 rounded-[14px] bg-bg-elevated text-[14px] font-medium text-text-primary disabled:opacity-40"
              >
                {sharing
                  ? "Préparation…"
                  : pair?.after &&
                      sharePendingKey ===
                        `${pair.before.date}|${pair.after.date}`
                    ? "Envoyer l’image"
                    : "Partager"}
              </button>
            ) : null}
            {onPlay ? (
              <button
                type="button"
                onClick={() => onPlay()}
                disabled={photos.length < 2}
                className="press-button h-11 flex-1 rounded-[14px] bg-bg-elevated text-[14px] font-medium text-text-primary disabled:opacity-40"
              >
                Défilé
              </button>
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

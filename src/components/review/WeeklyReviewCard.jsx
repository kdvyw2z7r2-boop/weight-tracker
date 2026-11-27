import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import GlassCard from '../ui/GlassCard'
import BadgeIcon from '../badges/BadgeIcon'
import { formatDelta, formatPace, formatWeightWithUnit } from '../../utils/format'
import { formatCmDelta } from '../../utils/measurements'
import { fr } from '../../utils/locale'
import { defaultReviewWeek, shiftWeek, weekBounds, weeklyReview } from '../../utils/weeklyReview'

const MAX_WEEKS_BACK = 11 // 12 semaines navigables, semaine courante incluse
const DISMISS_PREFIX = 'wt_review_dismissed:'

function readDismissed(userId) {
  try {
    return userId ? window.localStorage.getItem(`${DISMISS_PREFIX}${userId}`) : null
  } catch {
    return null
  }
}

function writeDismissed(userId, weekStart) {
  try {
    if (userId) window.localStorage.setItem(`${DISMISS_PREFIX}${userId}`, weekStart)
  } catch {
    // Best-effort.
  }
}

const signedPace = (pace, unit) => `${pace > 0 ? '+' : ''}${formatPace(pace, unit).replace('-', '−')}`

const shortDay = (iso) => format(parseISO(iso), 'd MMM', { locale: fr })

function rangeLabel(start, end) {
  const s = parseISO(start)
  const e = parseISO(end)
  if (s.getMonth() === e.getMonth()) return `${format(s, 'd', { locale: fr })} – ${format(e, 'd MMM', { locale: fr })}`
  return `${shortDay(start)} – ${shortDay(end)}`
}

function Chevron({ direction }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={direction === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
    </svg>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="text-[13px] font-medium text-text-secondary">{label}</dt>
      <dd className="min-w-0 text-right text-[14px] font-semibold tabular-nums text-text-primary">{children}</dd>
    </div>
  )
}

/** Carte « Ta semaine » : semaine en cours, ou le lundi le bilan de la semaine écoulée (fermable). */
function WeeklyReviewCard({ entries, settings, photosByDate, measurements, badges, userId }) {
  const [dismissed, setDismissed] = useState(() => readDismissed(userId))
  const [selected, setSelected] = useState(null)
  const today = new Date()
  const currentWeek = weekBounds(today).start
  const { weekStart: defaultWeek, isLastWeekRecap } = defaultReviewWeek(today, dismissed)
  const weekStart = selected ?? defaultWeek
  const minWeek = shiftWeek(currentWeek, -MAX_WEEKS_BACK)
  const showingRecap = isLastWeekRecap && weekStart === defaultWeek

  const review = useMemo(
    () => weeklyReview({ entries, settings, photos: photosByDate, measurements, badges, weekStart }),
    [entries, settings, photosByDate, measurements, badges, weekStart],
  )

  const unit = settings.unit
  const title = showingRecap
    ? 'Bilan de la semaine dernière'
    : weekStart === currentWeek
      ? 'Cette semaine'
      : weekStart === shiftWeek(currentWeek, -1)
        ? 'Semaine dernière'
        : `Semaine du ${shortDay(weekStart)}`

  const goodDirection = (delta) => (review.goalIsLoss ? delta < 0 : delta > 0)
  const deltaTone =
    review.deltaAvg == null || review.deltaAvg === 0
      ? 'text-text-secondary'
      : goodDirection(review.deltaAvg)
        ? 'text-good-text'
        : 'text-danger-text'

  const dismissRecap = () => {
    writeDismissed(userId, defaultWeek)
    setDismissed(defaultWeek)
    setSelected(null)
  }

  return (
    <GlassCard as="section" aria-labelledby="weekly-review-title" className="animate-fade-up animate-stagger-2 p-5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 id="weekly-review-title" className="text-[15px] font-semibold text-text-primary">
            {title}
          </h2>
          <p className="mt-0.5 text-[12px] text-text-secondary">{rangeLabel(review.start, review.end)}</p>
        </div>
        <div className="-mr-1 -mt-1 flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="glass-icon-btn press-button disabled:opacity-30"
            onClick={() => setSelected(shiftWeek(weekStart, -1))}
            disabled={weekStart <= minWeek}
            aria-label="Semaine précédente"
          >
            <Chevron direction="left" />
          </button>
          <button
            type="button"
            className="glass-icon-btn press-button disabled:opacity-30"
            onClick={() => setSelected(shiftWeek(weekStart, 1))}
            disabled={weekStart >= currentWeek}
            aria-label="Semaine suivante"
          >
            <Chevron direction="right" />
          </button>
        </div>
      </div>

      {review.count === 0 ? (
        <p className="mt-4 text-[14px] text-text-secondary">Aucune pesée sur cette semaine.</p>
      ) : (
        <dl className="mt-2 divide-y divide-white/10">
          <Row label="Moyenne">
            {formatWeightWithUnit(review.avg, unit)}
            {review.deltaAvg != null ? (
              <span className={`block text-[12px] font-medium ${deltaTone}`}>
                {formatDelta(review.deltaAvg, unit)} vs semaine préc.
              </span>
            ) : null}
          </Row>
          <Row label="Pesées">
            {review.daysLogged}/7
            {review.bestStreak > 1 ? (
              <span className="block text-[12px] font-medium text-streak">Série de {review.bestStreak} jours</span>
            ) : null}
          </Row>
          {review.planPace != null && review.pace != null ? (
            <Row label="Rythme vs plan">
              <span className={goodDirection(review.pace - review.planPace) || review.pace === review.planPace ? 'text-good-text' : 'text-text-primary'}>
                {signedPace(review.pace, unit)}
              </span>
              <span className="block text-[12px] font-medium text-plan">plan {signedPace(review.planPace, unit)}</span>
            </Row>
          ) : null}
          {review.measurementDelta ? (
            <Row label="Mensurations">
              <span className={review.measurementDelta.total < 0 ? 'text-good-text' : 'text-text-primary'}>
                {formatCmDelta(review.measurementDelta.total)}
              </span>
            </Row>
          ) : null}
        </dl>
      )}

      {review.photo?.url || review.badgesEarned.length ? (
        <div className="mt-3 flex items-center gap-3">
          {review.photo?.url ? (
            <img
              src={review.photo.url}
              alt={`Photo du ${shortDay(review.photo.date)}`}
              className="aspect-[9/16] w-12 shrink-0 rounded-xl object-cover"
            />
          ) : null}
          {review.badgesEarned.length ? (
            <ul className="flex min-w-0 flex-wrap items-center gap-2" aria-label="Badges obtenus cette semaine">
              {review.badgesEarned.map((badge) => (
                <li key={badge.id} className="flex items-center gap-1.5">
                  <BadgeIcon icon={badge.icon} category={badge.category} size={32} />
                  <span className="text-[12px] font-semibold text-text-primary">{badge.title}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {showingRecap ? (
        <button
          type="button"
          onClick={dismissRecap}
          className="press-button mt-3 min-h-11 w-full rounded-full text-[13px] font-semibold text-accent-text"
        >
          Fermer le bilan · voir cette semaine
        </button>
      ) : null}
    </GlassCard>
  )
}

export default WeeklyReviewCard

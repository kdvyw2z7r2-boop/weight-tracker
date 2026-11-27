import GlassCard from '../ui/GlassCard'
import BadgeIcon from './BadgeIcon'
import { formatBadgeProgress } from '../../utils/badges'
import { formatDateCompact } from '../../utils/locale'

/** Vitrine « Badges » (Progrès) : grille 3 colonnes, obtenus en couleur + date, à venir grisés + progression. */
function BadgesShowcase({ badges }) {
  const earnedCount = badges.filter((badge) => badge.earned).length
  return (
    <GlassCard as="section" aria-labelledby="badges-title" className="p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="badges-title" className="text-[15px] font-semibold text-text-primary">
          Badges
        </h3>
        <p className="text-[12px] font-medium tabular-nums text-text-secondary">
          {earnedCount} / {badges.length}
        </p>
      </div>
      <ul className="mt-4 grid grid-cols-3 gap-2">
        {badges.map((badge) => (
          <li key={badge.id} className="glass-sm flex flex-col items-center px-1.5 py-3 text-center">
            {/* Libellé complet pour les lecteurs d'écran ; seule l'icône est atténuée pour un badge à venir (contraste du texte). */}
            <span className="sr-only">
              {`${badge.title} — ${
                badge.earned ? `obtenu le ${formatDateCompact(badge.earnedAt)}` : `à venir, ${formatBadgeProgress(badge.progress)}`
              }`}
            </span>
            <BadgeIcon icon={badge.icon} category={badge.category} earned={badge.earned} size={44} />
            <p
              aria-hidden="true"
              className={`mt-2 text-[12px] font-semibold leading-tight ${badge.earned ? 'text-text-primary' : 'text-text-secondary'}`}
            >
              {badge.title}
            </p>
            <p aria-hidden="true" className="mt-0.5 text-[11px] tabular-nums leading-tight text-text-tertiary">
              {badge.earned ? formatDateCompact(badge.earnedAt) : formatBadgeProgress(badge.progress)}
            </p>
          </li>
        ))}
      </ul>
    </GlassCard>
  )
}

export default BadgesShowcase

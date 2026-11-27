import { useRef, useState } from 'react'
import GlassSheet from '../feature/GlassSheet'
import GlassButton from '../ui/GlassButton'
import BadgeIcon from './BadgeIcon'
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion'

/** Célébration sobre : une seule feuille listant tous les nouveaux badges, bouton « Continuer ». */
function CelebrationSheet({ badges, onDismiss }) {
  const reducedMotion = usePrefersReducedMotion()
  const continueRef = useRef(null)
  const open = badges.length > 0
  // Garde la dernière liste affichée pendant l'animation de fermeture.
  const [shown, setShown] = useState(badges)
  if (open && badges !== shown) setShown(badges)
  const many = shown.length > 1

  return (
    <GlassSheet
      open={open}
      title={many ? `${shown.length} nouveaux badges !` : 'Nouveau badge !'}
      subtitle="Bravo, continue comme ça."
      onClose={onDismiss}
      initialFocusRef={continueRef}
    >
      <ul className="mt-4 space-y-2">
        {shown.map((badge, index) => (
          <li
            key={badge.id}
            className={`glass-sm flex items-center gap-3 px-3 py-3 ${reducedMotion ? '' : 'animate-scale-in'}`}
            style={reducedMotion ? undefined : { animationDelay: `${index * 80}ms` }}
          >
            <BadgeIcon icon={badge.icon} category={badge.category} size={48} />
            <div className="min-w-0">
              <p className="text-[16px] font-semibold text-text-primary">{badge.title}</p>
              <p className="text-[13px] text-text-secondary">{badge.description}</p>
            </div>
          </li>
        ))}
      </ul>
      <GlassButton ref={continueRef} size="lg" className="mt-5 w-full" onClick={onDismiss}>
        Continuer
      </GlassButton>
    </GlassSheet>
  )
}

export default CelebrationSheet

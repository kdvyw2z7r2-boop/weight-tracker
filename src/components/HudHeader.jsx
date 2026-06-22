import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

function HudHeader({ title, subtitle, badge = null }) {
  const now = new Date()
  const time = format(now, 'HH:mm')
  const date = format(now, 'EEEE d MMMM', { locale: fr })

  return (
    <header className="animate-fade-up hud-header">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="hud-corner-tl" aria-hidden="true" />
            <h1 className="font-display text-[22px] font-bold uppercase tracking-[0.12em] neon-text-cyan">
              {title}
            </h1>
          </div>
          {subtitle ? (
            <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-text-tertiary">{subtitle}</p>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-[20px] font-bold tabular-nums text-white">{time}</p>
          <p className="mt-0.5 text-[10px] capitalize text-text-tertiary">{date}</p>
          {badge ? <div className="mt-2 flex justify-end">{badge}</div> : null}
        </div>
      </div>
    </header>
  )
}

export default HudHeader

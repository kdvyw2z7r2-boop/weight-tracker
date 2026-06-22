import { getCurrentStreak, getLast7DaysStatus } from '../utils/stats'

function StreakCard({ entries }) {
  const streak = getCurrentStreak(entries)
  const days = getLast7DaysStatus(entries)
  const completedCount = days.filter((day) => day.hasEntry).length

  return (
    <div className="hud-card animate-fade-up animate-stagger-6 press-card p-5">
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div>
            <p className="section-label">Série de pesées</p>
            <p className="mt-1 font-display text-2xl font-bold text-white">
              {streak}
              <span className="ml-1 text-sm font-medium text-text-tertiary">
                jour{streak !== 1 ? 's' : ''}
              </span>
              {streak > 3 ? <span className="ml-2">🔥</span> : null}
            </p>
          </div>
          <span className="data-badge">{completedCount}/7</span>
        </div>

        <div className="relative mt-6">
          <div
            className="absolute left-[18px] right-[18px] top-[18px] h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.3), transparent)' }}
            aria-hidden="true"
          />
          <div className="relative flex items-start justify-between">
            {days.map((day, index) => (
              <div
                key={day.date}
                className="animate-streak-pop flex flex-col items-center gap-2"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div
                  className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-transform duration-300 ${
                    day.hasEntry
                      ? 'bg-accent-green text-black shadow-[0_0_16px_rgba(57,255,20,0.45)]'
                      : 'border border-border bg-bg-elevated/80 text-text-tertiary'
                  } ${day.isToday && !day.hasEntry ? 'animate-pulse-soft' : ''}`}
                >
                  {day.hasEntry ? (
                    <svg viewBox="0 0 12 12" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <span className="text-base leading-none">×</span>
                  )}
                </div>
                {day.isToday ? (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-accent-green">Auj.</span>
                ) : (
                  <span className="h-[14px]" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </div>

        <p className="mt-4 text-[12px] leading-relaxed text-text-tertiary">
          {streak >= 7
            ? 'Semaine parfaite. Vous êtes une machine.'
            : streak >= 3
              ? 'Belle série en cours — gardez le rythme.'
              : 'Une pesée par jour, c\'est le secret des résultats durables.'}
        </p>
      </div>
    </div>
  )
}

export default StreakCard

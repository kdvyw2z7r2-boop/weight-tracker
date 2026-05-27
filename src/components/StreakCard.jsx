import { getCurrentStreak, getLast7DaysStatus } from '../utils/stats'

function StreakCard({ entries }) {
  const streak = getCurrentStreak(entries)
  const days = getLast7DaysStatus(entries)
  const completedCount = days.filter((day) => day.hasEntry).length

  return (
    <div className="card-base animate-fade-up animate-stagger-5 press-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="section-label">Série de pesées</p>
          <p className="mt-1 text-lg font-semibold text-text-primary">
            {streak} jour{streak !== 1 ? 's' : ''}
            {streak > 3 ? ' 🔥' : ''}
          </p>
        </div>
        <span className="rounded-full bg-bg-elevated px-2.5 py-1 text-[12px] font-medium text-text-secondary">
          {completedCount}/7
        </span>
      </div>

      <div className="relative mt-6">
        <div className="absolute left-[18px] right-[18px] top-[18px] h-px bg-border" aria-hidden="true" />
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
                    ? 'bg-accent-green text-black shadow-[0_0_12px_rgba(74,222,128,0.35)]'
                    : 'border border-border bg-bg-elevated text-text-tertiary'
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
                <span className="text-[10px] font-medium text-accent-green">Aujourd&apos;hui</span>
              ) : (
                <span className="h-[14px]" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 text-[13px] leading-relaxed text-text-tertiary">
        Pesez-vous au moins une fois par semaine pour garder votre série.
      </p>
    </div>
  )
}

export default StreakCard

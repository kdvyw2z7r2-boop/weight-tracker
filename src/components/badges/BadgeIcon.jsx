const PATHS = {
  scale: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="4" />
      <path d="M9 10a3 3 0 0 1 6 0" />
      <path d="M12 10l1.5-1.5" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" />
    </>
  ),
  flame: <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1.2-3.6 2.4-4.6.3 1.6 1.1 2.6 2.1 3.1C11 9.5 11 6 12 3z" />,
  camera: (
    <>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
      <circle cx="12" cy="13" r="3.2" />
    </>
  ),
  ruler: (
    <>
      <rect x="3" y="8" width="18" height="8" rx="2" />
      <path d="M7 8v3M11 8v4M15 8v3M19 8v2" />
    </>
  ),
}

const CATEGORY_TONE = {
  loss: 'text-accent',
  goal: 'text-goal',
  streak: 'text-streak',
  photos: 'text-plan',
  cm: 'text-good',
}

/** Médaillon d'un badge : icône SVG au trait ; grisé quand il n'est pas obtenu. */
function BadgeIcon({ icon, category, earned = true, size = 48 }) {
  const tone = earned ? CATEGORY_TONE[category] ?? 'text-accent' : 'text-text-tertiary opacity-50'
  return (
    <span
      className={`glass-pill flex shrink-0 items-center justify-center ${tone}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        width={size * 0.5}
        height={size * 0.5}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {PATHS[icon] ?? PATHS.target}
      </svg>
    </span>
  )
}

export default BadgeIcon

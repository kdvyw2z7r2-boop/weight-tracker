// SVG presentation attributes accept CSS variables, so charts reference the
// tokens defined in index.css directly (single source of truth for the palette).
export const CHART_COLORS = {
  weight: 'var(--color-weight)',
  plan: 'var(--color-plan)',
  avg: 'var(--color-avg)',
  goal: 'var(--color-goal)',
  grid: 'var(--color-grid)',
  axis: 'var(--color-axis)',
  track: 'var(--color-track)',
  card: 'var(--color-bg-card)',
  text: 'var(--color-text-primary)',
  textSecondary: 'var(--color-text-secondary)',
}

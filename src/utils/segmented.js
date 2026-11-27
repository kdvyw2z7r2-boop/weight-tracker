// Navigation clavier d'un groupe radio (WAI-ARIA « Radio Group ») : flèches avec bouclage, Home/End.

export function nextSegmentIndex(key, current, count) {
  if (count <= 0) return null
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return current < 0 ? 0 : (current + 1) % count
    case 'ArrowLeft':
    case 'ArrowUp':
      return current < 0 ? count - 1 : (current - 1 + count) % count
    case 'Home':
      return 0
    case 'End':
      return count - 1
    default:
      return null
  }
}

/** Index du seul segment atteignable par Tab : l'option cochée, sinon la première. */
export function tabStopIndex(values, value) {
  const index = values.indexOf(value)
  return index < 0 ? 0 : index
}

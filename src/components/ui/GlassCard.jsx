const SIZE_CLASS = {
  md: 'glass',
  sm: 'glass-sm',
}

/** Carte en verre : `md` = rayon 24 px, `sm` = rayon 18 px. Le rembourrage reste à l'appelant. */
function GlassCard({ as: Component = 'div', size = 'md', className = '', children, ...rest }) {
  return (
    <Component className={`${SIZE_CLASS[size] ?? SIZE_CLASS.md} ${className}`} {...rest}>
      {children}
    </Component>
  )
}

export default GlassCard

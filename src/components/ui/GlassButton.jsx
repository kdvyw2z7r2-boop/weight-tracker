const VARIANT_CLASS = {
  primary: 'btn-primary',
  secondary: 'glass-pill font-semibold text-text-primary',
  danger: 'btn-glass-danger',
}

const SIZE_CLASS = {
  md: 'h-11 px-5 text-[15px]',
  lg: 'h-[52px] px-6 text-[17px]',
}

/** Bouton pilule : principal plein accent (texte foncé), secondaire en verre, danger teinté rouge doux. */
function GlassButton({ variant = 'primary', size = 'md', type = 'button', className = '', children, ...rest }) {
  return (
    <button
      type={type}
      className={`press-button inline-flex items-center justify-center gap-2 disabled:opacity-50 ${VARIANT_CLASS[variant] ?? VARIANT_CLASS.primary} ${SIZE_CLASS[size] ?? SIZE_CLASS.md} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export default GlassButton

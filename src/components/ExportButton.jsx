function ExportButton({ onExport, label }) {
  return (
    <button
      type="button"
      onClick={onExport}
      className="press-button flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left text-[15px] text-text-primary transition duration-150"
    >
      {label}
      <span aria-hidden="true" className="text-[17px] text-text-secondary">
        ›
      </span>
    </button>
  )
}

export default ExportButton

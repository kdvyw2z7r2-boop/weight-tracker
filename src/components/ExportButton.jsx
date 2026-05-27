function ExportButton({ onExport, label }) {
  return (
    <button
      type="button"
      onClick={onExport}
      className="press-button flex h-12 w-full items-center rounded-xl bg-bg-elevated px-4 text-left text-[15px] text-text-primary transition duration-150"
    >
      {label}
    </button>
  )
}

export default ExportButton

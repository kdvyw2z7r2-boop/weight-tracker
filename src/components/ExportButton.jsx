function ExportButton({ onExport, label }) {
  return (
    <button
      type="button"
      onClick={onExport}
      className="w-full rounded-xl border border-border bg-bg-elevated px-3 py-2 text-left"
    >
      {label}
    </button>
  )
}

export default ExportButton

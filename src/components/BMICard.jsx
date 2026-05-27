function bmiCategory(value) {
  if (value < 18.5) return 'Insuffisance ponderale'
  if (value < 25) return 'Poids normal'
  if (value < 30) return 'Surpoids'
  return 'Obesite'
}

function BMICard({ weight, height }) {
  const bmi = height > 0 ? weight / (height / 100) ** 2 : 0
  return (
    <div className="rounded-2xl bg-bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-text-secondary">IMC actuel</p>
      <p className="mt-1 text-2xl font-semibold">{bmi.toFixed(1)}</p>
      <p className="text-sm text-text-secondary">{bmiCategory(bmi)}</p>
    </div>
  )
}

export default BMICard

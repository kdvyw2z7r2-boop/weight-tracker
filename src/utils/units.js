export const KG_TO_LBS = 2.20462

const round2 = (value) => Math.round(value * 100) / 100

export function convertWeightValue(value, nextUnit) {
  if (value == null || !Number.isFinite(Number(value))) return value
  const n = Number(value)
  return round2(nextUnit === 'lbs' ? n * KG_TO_LBS : n / KG_TO_LBS)
}

const CONVERTED_FIELDS = ['targetWeight', 'planStartWeight', 'challengeStartWeight', 'weeklyPace']

export function convertSettingsUnit(settings, nextUnit) {
  if (settings.unit === nextUnit) return settings
  const next = { ...settings, unit: nextUnit }
  for (const field of CONVERTED_FIELDS) {
    next[field] = convertWeightValue(settings[field], nextUnit)
  }
  return next
}

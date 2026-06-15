import { addDays, parseISO } from 'date-fns'

export const COMPARE_OFFSETS = [
  { key: 'j7', label: 'J1 vs J7', days: 7 },
  { key: 'j30', label: 'J1 vs J30', days: 30 },
  { key: 'j60', label: 'J1 vs J60', days: 60 },
]

export function sortPhotosByDate(photosByDate) {
  return Object.entries(photosByDate)
    .map(([date, photo]) => ({ date, ...photo }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
}

export function findPhotoOnOrAfter(sortedPhotos, targetDate) {
  return sortedPhotos.find((photo) => photo.date >= targetDate) ?? null
}

export function getWeightForDate(entries, date) {
  const dayEntries = entries.filter((entry) => entry.date === date)
  if (!dayEntries.length) return null
  return dayEntries.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0].weight
}

export function buildEntryComparePair(photosByDate, entries, selectedDate) {
  const sorted = sortPhotosByDate(photosByDate).filter((photo) => photo.url)
  if (sorted.length < 2) return null

  const before = sorted[0]
  let after = sorted.find((photo) => photo.date === selectedDate)

  if (!after || before.date === after.date) {
    after = sorted[sorted.length - 1]
  }

  if (before.date === after.date) return null

  return {
    before: {
      date: before.date,
      url: before.url,
      weight: getWeightForDate(entries, before.date),
    },
    after: {
      date: after.date,
      url: after.url,
      weight: getWeightForDate(entries, after.date),
    },
  }
}

export function buildComparePairs(photosByDate, entries) {
  const sorted = sortPhotosByDate(photosByDate)
  if (!sorted.length) return []

  const anchor = sorted[0]

  return COMPARE_OFFSETS.map((offset) => {
    const targetDate = addDays(parseISO(anchor.date), offset.days).toISOString().slice(0, 10)
    const after = findPhotoOnOrAfter(sorted, targetDate)

    return {
      key: offset.key,
      label: offset.label,
      before: {
        date: anchor.date,
        url: anchor.url,
        weight: getWeightForDate(entries, anchor.date),
      },
      after: after
        ? {
            date: after.date,
            url: after.url,
            weight: getWeightForDate(entries, after.date),
          }
        : null,
      targetDate,
    }
  })
}

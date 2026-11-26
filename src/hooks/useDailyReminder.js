import { useEffect, useRef } from 'react'
import { localIsoDate } from '../utils/dates'
import { getReminderStorageKey, msUntilNextReminder, shouldRemind } from '../utils/reminder'
import useToast from './useToast'

function readLast(userId) {
  try {
    return localStorage.getItem(getReminderStorageKey(userId))
  } catch {
    return null
  }
}

function writeLast(userId, date) {
  try {
    localStorage.setItem(getReminderStorageKey(userId), date)
  } catch {
    // Stockage indisponible : on ignore.
  }
}

async function showSystemNotification() {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false
  if (!('serviceWorker' in navigator)) return false
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return false
    await registration.showNotification('Pesée du jour', {
      body: "Pense à enregistrer ton poids aujourd'hui.",
      icon: `${import.meta.env.BASE_URL}icons/icon-192.png`,
      badge: `${import.meta.env.BASE_URL}icons/badge-96.png`,
      tag: 'daily-reminder',
    })
    return true
  } catch {
    return false
  }
}

/** Rappel local « best effort » : à l'ouverture, au retour au premier plan, et à l'heure choisie si l'app est ouverte. */
export default function useDailyReminder({ userId, settings, entries, onAdd, ready = true }) {
  const { show } = useToast()
  const latest = useRef({})
  useEffect(() => {
    latest.current = { entries, onAdd, show }
  })

  const enabled = ready && Boolean(userId) && Boolean(settings?.reminderEnabled)
  const reminderTime = settings?.reminderTime

  useEffect(() => {
    if (!enabled) return undefined
    let timer = null

    const check = async () => {
      const now = new Date()
      const today = localIsoDate(now)
      const { entries: list } = latest.current
      const due = shouldRemind({
        now,
        reminderTime,
        enabled,
        hasEntryToday: (list ?? []).some((entry) => entry.date === today),
        lastRemindedDate: readLast(userId),
      })
      if (!due) return
      writeLast(userId, today)
      const sent = await showSystemNotification()
      if (sent) return
      const { onAdd: addNow, show: toastNow } = latest.current
      toastNow("Pense à enregistrer ton poids aujourd'hui.", {
        action: { label: 'Ajouter', onClick: () => addNow?.() },
        duration: 8000,
      })
    }

    const arm = () => {
      clearTimeout(timer)
      const delay = msUntilNextReminder(new Date(), reminderTime)
      if (delay != null) {
        timer = setTimeout(() => {
          check()
          arm()
        }, delay + 250)
      }
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        check()
        arm()
      }
    }

    check()
    arm()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled, reminderTime, userId])
}

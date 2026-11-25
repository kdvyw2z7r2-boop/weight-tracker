import { useEffect, useRef } from 'react'
import { localIsoDate } from '../utils/dates'
import { msUntilReminder, shouldRemind } from '../utils/reminder'
import useToast from './useToast'

const STORAGE_KEY = 'wt_last_reminder'

function readLast() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function writeLast(date) {
  try {
    localStorage.setItem(STORAGE_KEY, date)
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
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: 'daily-reminder',
    })
    return true
  } catch {
    return false
  }
}

/** Rappel local « best effort » : à l'ouverture, au retour au premier plan, et à l'heure choisie si l'app est ouverte. */
export default function useDailyReminder({ settings, entries, onAdd, ready = true }) {
  const { show } = useToast()
  const latest = useRef({})
  useEffect(() => {
    latest.current = { entries, onAdd, show }
  })

  const enabled = ready && Boolean(settings?.reminderEnabled)
  const reminderTime = settings?.reminderTime

  useEffect(() => {
    if (!enabled) return undefined
    let timer = null
    let cancelled = false

    const check = async () => {
      const now = new Date()
      const today = localIsoDate(now)
      const { entries: list, onAdd: add, show: toast } = latest.current
      const due = shouldRemind({
        now,
        reminderTime,
        enabled,
        hasEntryToday: (list ?? []).some((entry) => entry.date === today),
        lastRemindedDate: readLast(),
      })
      if (!due) return
      writeLast(today)
      const sent = await showSystemNotification()
      if (cancelled || sent) return
      toast("Pense à enregistrer ton poids aujourd'hui.", {
        action: { label: 'Ajouter', onClick: () => add?.() },
        duration: 8000,
      })
    }

    const arm = () => {
      clearTimeout(timer)
      const delay = msUntilReminder(new Date(), reminderTime)
      if (delay != null) timer = setTimeout(() => { check(); }, delay + 250)
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
      cancelled = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled, reminderTime])
}

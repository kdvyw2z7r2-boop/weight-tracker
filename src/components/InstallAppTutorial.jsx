import { useCallback, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import useDialogBasics from '../hooks/useDialogBasics'

const IOS_STEPS = [
  "Appuie sur le bouton Partager (l'icône carrée avec une flèche vers le haut en bas de l'écran).",
  "Fais défiler les options vers le bas et choisis Sur l'écran d'accueil.",
  "Appuie sur Ajouter en haut à droite.",
]

const ANDROID_STEPS = [
  "Appuie sur les trois petits points en haut à droite du navigateur.",
  "Sélectionne l'option Ajouter à l'écran d'accueil ou Installer l'application.",
  "Valide en cliquant sur Ajouter.",
]

function getDeviceType() {
  const userAgent = navigator.userAgent || ''
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isAndroid = /Android/i.test(userAgent)

  if (isIOS) return 'ios'
  if (isAndroid) return 'android'
  return 'other'
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M10 18h4" strokeLinecap="round" />
    </svg>
  )
}

function TutorialSteps({ title, steps, note }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/5 p-4">
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      <ol className="mt-3 space-y-3">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3 text-[14px] leading-relaxed text-text-secondary">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-bg-primary">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      {note ? <p className="mt-4 text-[13px] leading-relaxed text-text-secondary">{note}</p> : null}
    </div>
  )
}

function InstallAppTutorial({ leading = null }) {
  const [isOpen, setIsOpen] = useState(false)
  const deviceType = useMemo(() => getDeviceType(), [])
  const showIOS = deviceType === 'ios' || deviceType === 'other'
  const showAndroid = deviceType === 'android' || deviceType === 'other'

  const sheetRef = useRef(null)
  const closeRef = useRef(null)
  const titleId = useId()
  const close = useCallback(() => setIsOpen(false), [])
  useDialogBasics({ open: isOpen, onClose: close, containerRef: sheetRef, initialFocusRef: closeRef })

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        {leading}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="press-button glass-pill ml-auto flex h-11 shrink-0 items-center gap-2 px-4 text-[13px] font-medium text-text-secondary transition hover:text-text-primary"
        >
          <PhoneIcon />
          Installer l&apos;app
        </button>
      </div>

      {/* Portail : au-dessus de la barre d'onglets (hors du contexte d'empilement de <main>). */}
      {isOpen ? createPortal(
        <div className="fixed inset-0 z-40 flex items-end justify-center">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Fermer le tutoriel"
            onClick={close}
            className="animate-modal-overlay absolute inset-0 bg-black/60"
          />
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="glass-strong animate-modal-sheet relative w-full max-w-md !rounded-b-none px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3"
          >
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-white/30" aria-hidden="true" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="section-label">Widget / PWA</p>
                <h2 id={titleId} className="mt-1 text-[20px] font-semibold tracking-[-0.01em] text-text-primary">Ajouter à l&apos;écran d&apos;accueil</h2>
                <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
                  Installe l&apos;app sur ton téléphone pour l&apos;ouvrir comme une application, avec ton lien unique déjà configuré.
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                className="press-button glass-icon-btn shrink-0 text-[18px]"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 max-h-[65vh] space-y-3 overflow-y-auto pr-1">
              {showIOS ? (
                <TutorialSteps
                  title="iPhone · Safari"
                  steps={IOS_STEPS}
                  note="L'application sera installée sur ton téléphone comme un Widget/App. Ton lien unique avec ton historique y sera directement configuré pour que tu ne perdes jamais tes données !"
                />
              ) : null}
              {showAndroid ? (
                <TutorialSteps title="Android · Chrome" steps={ANDROID_STEPS} />
              ) : null}
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  )
}

export default InstallAppTutorial

import { useState } from 'react'
import { normalizeUserId, switchToUserId } from '../hooks/useUserId'
import { useToast } from '../hooks/useToast'
import ConfirmSheet from './ConfirmSheet'
import GlassButton from './ui/GlassButton'
import GlassCard from './ui/GlassCard'

function AccountCard({ userId }) {
  const { show } = useToast()
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(null)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(userId)
      show('Code copié. Garde-le précieusement.', { tone: 'success' })
    } catch {
      show('Copie impossible : sélectionne le code et copie-le.', { tone: 'error' })
    }
  }

  const submit = (event) => {
    event.preventDefault()
    const code = normalizeUserId(draft)
    if (!code) {
      show('Code invalide. Colle le code complet (il commence souvent par « user_ »).', { tone: 'error' })
      return
    }
    if (code === userId) {
      show('Tu utilises déjà ce compte.', { tone: 'default' })
      return
    }
    setPending(code)
  }

  return (
    <div className="animate-fade-up">
      <p className="section-label mb-2 px-1">Mon compte</p>
      <GlassCard className="space-y-4 p-4">
        <div>
          <p className="text-[15px] font-semibold text-text-primary">Code de ton compte</p>
          <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
            Tes pesées et photos sont rattachées à ce code. Note-le : il permet de les retrouver si tu réinstalles l'app
            ou changes de téléphone.
          </p>
          <p className="glass-field mt-3 select-all break-all px-3 py-3 font-mono text-[13px] text-text-primary">{userId}</p>
          <GlassButton variant="secondary" onClick={copy} className="mt-3 w-full">
            Copier le code
          </GlassButton>
        </div>
        <form onSubmit={submit} className="border-t border-white/10 pt-4">
          <label htmlFor="restore-code" className="text-[15px] font-semibold text-text-primary">
            Récupérer un compte
          </label>
          <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
            Colle ici ton ancien code pour retrouver tes données.
          </p>
          <input
            id="restore-code"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="user_…"
            className="glass-field mt-3 h-12 w-full px-3 font-mono text-[14px] text-text-primary"
          />
          <GlassButton type="submit" className="mt-3 w-full" disabled={!draft.trim()}>
            Récupérer ce compte
          </GlassButton>
        </form>
      </GlassCard>
      <ConfirmSheet
        open={Boolean(pending)}
        title="Passer sur ce compte ?"
        message="L'app va se recharger avec les données de ce code. Le compte actuel reste accessible avec son propre code."
        confirmLabel="Récupérer"
        onConfirm={() => {
          if (!switchToUserId(pending)) show('Code invalide.', { tone: 'error' })
        }}
        onCancel={() => setPending(null)}
      />
    </div>
  )
}

export default AccountCard

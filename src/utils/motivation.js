const QUOTES = {
  start: [
    { text: 'Chaque voyage commence par une première pesée.', tag: 'DÉPART' },
    { text: 'La discipline d\'aujourd\'hui forge le corps de demain.', tag: 'MINDSET' },
    { text: 'Vous n\'avez pas besoin d\'être parfait, juste constant.', tag: 'FOCUS' },
  ],
  streak: [
    { text: 'Votre série est en feu — ne lâchez rien maintenant.', tag: 'STREAK' },
    { text: 'La régularité bat la motivation, à chaque fois.', tag: 'DISCIPLINE' },
    { text: 'Jour après jour, vous construisez une version plus forte.', tag: 'PROGRÈS' },
  ],
  loss: [
    { text: 'Vous avancez. Le miroir suivra, continuez.', tag: 'VICTOIRE' },
    { text: 'Chaque gramme compte. Vous êtes sur la bonne trajectoire.', tag: 'TRAJECTOIRE' },
    { text: 'La constance crée des résultats que la motivation seule ne peut pas.', tag: 'RÉSULTAT' },
  ],
  gain: [
    { text: 'Un écart n\'est pas un échec. Revenez au plan, pas au regret.', tag: 'REPRISE' },
    { text: 'Les champions se relèvent. Votre prochaine pesée compte.', tag: 'RÉSILIENCE' },
    { text: 'Analysez, ajustez, avancez. C\'est ça, le vrai progrès.', tag: 'AJUSTEMENT' },
  ],
  goal: [
    { text: 'L\'objectif est proche — gardez le cap, vous y êtes presque.', tag: 'OBJECTIF' },
    { text: 'Plus de 75% du chemin parcouru. Finissez en beauté.', tag: 'FINAL' },
    { text: 'Vous avez prouvé que c\'était possible. Terminez le travail.', tag: 'DÉTERMINATION' },
  ],
  neutral: [
    { text: 'Le suivi est votre superpouvoir. Les données ne mentent pas.', tag: 'DATA' },
    { text: 'Mesurez, ajustez, progressez. Le cycle du champion.', tag: 'CYCLE' },
    { text: 'Votre corps répond à ce que vous mesurez avec constance.', tag: 'CONSCIENCE' },
  ],
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)]
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bonjour'
  if (hour < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

export function getMotivation({ entriesCount = 0, streak = 0, delta = null, progress = 0, monthVariation = null }) {
  const greeting = getGreeting()

  if (entriesCount === 0) {
    return { ...pickRandom(QUOTES.start), greeting, accent: 'cyan' }
  }

  if (progress >= 75) {
    return { ...pickRandom(QUOTES.goal), greeting, accent: 'amber' }
  }

  if (streak >= 3) {
    return { ...pickRandom(QUOTES.streak), greeting, accent: 'purple' }
  }

  if (delta != null && delta < 0) {
    return { ...pickRandom(QUOTES.loss), greeting, accent: 'green' }
  }

  if (delta != null && delta > 0) {
    return { ...pickRandom(QUOTES.gain), greeting, accent: 'red' }
  }

  if (monthVariation != null && monthVariation < 0) {
    return { ...pickRandom(QUOTES.loss), greeting, accent: 'green' }
  }

  return { ...pickRandom(QUOTES.neutral), greeting, accent: 'cyan' }
}

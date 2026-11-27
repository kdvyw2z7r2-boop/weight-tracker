/** Enveloppe `fn` : les appels concurrents partagent une seule invocation ; une fois terminée, un nouvel appel relance `fn`. */
export function createSingleFlight(fn) {
  let inFlight = null
  return (...args) => {
    if (!inFlight) {
      inFlight = Promise.resolve()
        .then(() => fn(...args))
        .finally(() => {
          inFlight = null
        })
    }
    return inFlight
  }
}

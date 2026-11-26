/**
 * Sérialise des sauvegardes asynchrones : une seule à la fois.
 * Les demandes arrivées pendant une sauvegarde sont fusionnées : seule la dernière est
 * exécutée ensuite, et toutes les promesses en attente suivent son résultat (valeur ou erreur).
 */
export function createSaveQueue() {
  let running = false
  let pending = null // { task, waiters: [{ resolve, reject }] }

  const runNext = async () => {
    running = true
    while (pending) {
      const { task, waiters } = pending
      pending = null
      try {
        const result = await task()
        waiters.forEach((waiter) => waiter.resolve(result))
      } catch (error) {
        waiters.forEach((waiter) => waiter.reject(error))
      }
    }
    running = false
  }

  return {
    enqueue(task) {
      return new Promise((resolve, reject) => {
        const waiters = pending ? pending.waiters : []
        waiters.push({ resolve, reject })
        pending = { task, waiters }
        if (!running) runNext()
      })
    },
  }
}

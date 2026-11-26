import { createContext, useContext } from 'react'

export const ToastContext = createContext({ show: () => {}, dismiss: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export default useToast

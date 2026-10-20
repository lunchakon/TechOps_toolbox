import { useCallback, useState } from 'react'

/**
 * localStorage-backed state for NON-SENSITIVE preferences only (theme, timezone).
 * Never use this for user-entered tool input, tokens or payloads.
 */
export function usePersistentState<T extends string = string>(key: string, initial: NoInfer<T>): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      return (localStorage.getItem(key) as T | null) ?? initial
    } catch {
      return initial
    }
  })
  const set = useCallback(
    (next: T) => {
      setValue(next)
      try {
        localStorage.setItem(key, next)
      } catch {
        /* storage unavailable */
      }
    },
    [key],
  )
  return [value, set]
}

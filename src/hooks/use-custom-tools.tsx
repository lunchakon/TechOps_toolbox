import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { loadCustomTools, type CustomToolsResult } from '@/lib/custom-tools'

const EMPTY: CustomToolsResult = { sections: [], warnings: [] }
const CustomToolsContext = createContext<CustomToolsResult>(EMPTY)

/** Loads the operator-managed external tool list once per page load. */
export function CustomToolsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CustomToolsResult>(EMPTY)
  useEffect(() => {
    const controller = new AbortController()
    loadCustomTools(controller.signal).then((r) => {
      if (!controller.signal.aborted) setState(r)
    })
    return () => controller.abort()
  }, [])
  return <CustomToolsContext.Provider value={state}>{children}</CustomToolsContext.Provider>
}

export function useCustomTools(): CustomToolsResult {
  return useContext(CustomToolsContext)
}

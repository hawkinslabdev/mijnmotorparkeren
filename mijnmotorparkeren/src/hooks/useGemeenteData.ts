import { useState, useEffect, useCallback, useRef } from 'react'
import type { Gemeente } from '../types/gemeente'
import { fetchGemeenteIndex, fetchFullGemeente, type GemeenteLite } from '../data/index'

interface UseGemeenteDataReturn {
  /** Lite gemeente objects — sufficient for map rendering (colors, boundaries, names). */
  gemeentes: Gemeente[]
  loading: boolean
  error: string | null
  /** Load the full gemeente JSON (with parking rules) on demand. Uses an in-memory cache. */
  loadFullGemeente: (id: string) => Promise<Gemeente | null>
}

// Module-level cache: persists across re-renders and re-mounts
const fullGemeenteCache = new Map<string, Gemeente>()

export function useGemeenteData(): UseGemeenteDataReturn {
  const [gemeentes, setGemeentes] = useState<Gemeente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    abortRef.current = ctrl
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const lite: GemeenteLite[] = await fetchGemeenteIndex()
        if (ctrl.signal.aborted) return
        // Cast lite objects as Gemeente — parkingRules/boundaries are absent but
        // that is intentional; the map only needs parkingStatus + coordinates.
        setGemeentes(lite as unknown as Gemeente[])
      } catch (err) {
        if (ctrl.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Failed to load gemeente data')
      } finally {
        if (!ctrl.signal.aborted) setLoading(false)
      }
    })()

    return () => ctrl.abort()
  }, [])

  const loadFullGemeente = useCallback(async (id: string): Promise<Gemeente | null> => {
    if (fullGemeenteCache.has(id)) return fullGemeenteCache.get(id)!
    try {
      const full = await fetchFullGemeente(id)
      fullGemeenteCache.set(id, full)
      return full
    } catch (err) {
      console.error(`Failed to load full gemeente ${id}:`, err)
      return null
    }
  }, [])

  return { gemeentes, loading, error, loadFullGemeente }
}

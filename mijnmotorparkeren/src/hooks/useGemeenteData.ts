// src/hooks/useGemeenteData.ts
import { useState, useEffect, useCallback } from 'react'
import { Gemeente, GemeenteIndex } from '../types/gemeente'
import { 
  gemeenteArray, 
  gemeenteIndex, 
  getVersionedJsonUrl 
} from '../data'

interface UseGemeenteDataReturn {
  gemeentes: Gemeente[]
  gemeenteIndex: GemeenteIndex | null
  loading: boolean
  error: string | null
  getGemeenteById: (id: string) => Promise<Gemeente | null>
  refreshData: () => Promise<void>
}

// Cache for gemeente data (now just for API compatibility, data is pre-loaded)
const gemeenteCache = new Map<string, Gemeente>()
let indexCache: GemeenteIndex | null = null

export function useGemeenteData(): UseGemeenteDataReturn {
  const [gemeentes, setGemeentes] = useState<Gemeente[]>([])
  const [gemeenteIndexState, setGemeenteIndex] = useState<GemeenteIndex | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load gemeente index, now instant since data is pre-loaded
  const loadIndex = async (): Promise<GemeenteIndex | null> => {
    try {
      if (indexCache) return indexCache

      console.log('Loading gemeente index from bundled data...')
      
      // Validate index structure (same validation as before)
      if (!gemeenteIndex.gemeentes || !Array.isArray(gemeenteIndex.gemeentes)) {
        throw new Error('Invalid gemeente index structure')
      }

      console.log(`Loaded index with ${gemeenteIndex.gemeentes.length} gemeentes from bundle`)
      indexCache = gemeenteIndex as GemeenteIndex
      return indexCache
    } catch (err) {
      console.error('Error loading gemeente index:', err)
      throw err
    }
  }

  // Load individual gemeente data at runtime with cache-busting
  const getGemeenteById = useCallback(async (id: string): Promise<Gemeente | null> => {
    try {
      // Check cache first (for API compatibility)
      if (gemeenteCache.has(id)) {
        return gemeenteCache.get(id)!
      }

      console.log(`Fetching gemeente data for: ${id}`)
      const url = getVersionedJsonUrl('gemeentes', id)
      const response = await fetch(url)
      if (!response.ok) {
        console.warn(`Gemeente data not found: ${id} (HTTP ${response.status})`)
        return null
      }
      const gemeente = await response.json()
      // Validate gemeente structure
      if (!gemeente.id || !gemeente.name) {
        console.warn(`Invalid gemeente data structure for ${id}:`, gemeente)
        return null
      }
      // Cache the gemeente (for API compatibility)
      gemeenteCache.set(id, gemeente)
      return gemeente
    } catch (err) {
      console.error(`Error loading gemeente ${id}:`, err)
      return null
    }
  }, [])

  // Load all gemeente data, now instant since data is pre-loaded
  const loadAllGemeenteData = useCallback(async (): Promise<Gemeente[]> => {
    console.log('Loading all gemeente data from bundle...')
    
    try {
      const loadedGemeentes = [...gemeenteArray]
      
      // Validate that we have data
      if (loadedGemeentes.length === 0) {
        console.warn('No gemeente data found in bundle')
        return []
      }

      console.log(`Successfully loaded ${loadedGemeentes.length} gemeentes from bundle`)
      return loadedGemeentes
    } catch (err) {
      console.error('Error loading all gemeente data:', err)
      throw err
    }
  }, [])

  // Refresh data function, simplified since data is bundled
  const refreshData = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    
    try {
      // Clear caches
      gemeenteCache.clear()
      indexCache = null
      
      // Reload everything (now instant)
      const index = await loadIndex()
      if (!index) {
        throw new Error('Failed to load gemeente index')
      }

      setGemeenteIndex(index)
      
      const gemeenteData = await loadAllGemeenteData()
      setGemeentes(gemeenteData)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error refreshing gemeente data:', err)
    } finally {
      setLoading(false)
    }
  }, [loadAllGemeenteData])

  useEffect(() => {
    let isMounted = true

    const initialLoad = async () => {
      try {
        setLoading(true)
        setError(null)

        const index = await loadIndex()
        if (!index) {
          throw new Error('Failed to load gemeente index')
        }

        if (isMounted) {
          setGemeenteIndex(index)
          
          const gemeenteData = await loadAllGemeenteData()
          if (isMounted) {
            setGemeentes(gemeenteData)
          }
        }
      } catch (err) {
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load gemeente data'
          setError(errorMessage)
          console.error('Error in initial load:', err)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    initialLoad()

    return () => {
      isMounted = false
    }
  }, [loadAllGemeenteData])

  return {
    gemeentes,
    gemeenteIndex: gemeenteIndexState,
    loading,
    error,
    getGemeenteById,
    refreshData
  }
}
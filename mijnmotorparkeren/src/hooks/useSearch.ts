import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Fuse from 'fuse.js'
import { useGemeenteData } from './useGemeenteData'
import type { Gemeente } from '@/types/gemeente'

interface UseSearchReturn {
  results: Gemeente[]
  isSearching: boolean
  error: string | null
  search: (query: string) => void
  clearResults: () => void
}

const SEARCH_OPTIONS = {
  keys: [
    { name: 'name', weight: 0.7 },
    { name: 'province', weight: 0.3 },
  ],
  threshold: 0.3,
  includeScore: true,
  minMatchCharLength: 1,
  ignoreLocation: true,
  shouldSort: true,
}

export function useSearch(): UseSearchReturn {
  const { gemeentes, loading: dataLoading } = useGemeenteData()

  const [results, setResults] = useState<Gemeente[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentQuery, setCurrentQuery] = useState('')

  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  const fuse = useMemo(() => {
    if (!gemeentes || dataLoading || !Array.isArray(gemeentes) || gemeentes.length === 0) {
      return null
    }

    console.log(`[fuse] Loaded with ${gemeentes.length} gemeentes`)
    return new Fuse(gemeentes, SEARCH_OPTIONS)
  }, [gemeentes, dataLoading])

  const search = useCallback(
    (query: string): void => {
      if (!isMounted.current) return
      if (query === currentQuery) return

      setCurrentQuery(query)

      if (!fuse) {
        setError('Search not available, data still loading')
        setResults([])
        return
      }

      if (!query.trim()) {
        setResults(gemeentes.slice(0, 8))
        setError(null)
        setIsSearching(false)
        return
      }

      setIsSearching(true)
      setError(null)

      setTimeout(() => {
        if (!isMounted.current) return

        try {
          const searchResults = fuse.search(query)

          const searchedResults: Gemeente[] = searchResults
            .slice(0, 10)
            .map((result) => result.item)

          if (isMounted.current) {
            setResults(searchedResults)

            if (searchedResults.length === 0) {
              setError(`No gemeentes found for "${query}"`)
            }
          }
        } catch (err) {
          if (isMounted.current) {
            const errorMessage = err instanceof Error ? err.message : 'Search failed'
            setError(errorMessage)
            console.error('Search error:', err)
            setResults([])
          }
        } finally {
          if (isMounted.current) {
            setIsSearching(false)
          }
        }
      }, 100)
    },
    [fuse, gemeentes, currentQuery]
  )

  const clearResults = useCallback(() => {
    if (!isMounted.current) return

    setResults([])
    setError(null)
    setIsSearching(false)
    setCurrentQuery('')
  }, [])

  useEffect(() => {
    if (dataLoading) {
      clearResults()
    }
  }, [dataLoading, clearResults])

  useEffect(() => {
    if (!dataLoading && gemeentes.length > 0 && results.length === 0 && !currentQuery) {
      setResults(gemeentes.slice(0, 8))
    }
  }, [dataLoading, gemeentes, results.length, currentQuery])

  return {
    results,
    isSearching,
    error,
    search,
    clearResults,
  }
}

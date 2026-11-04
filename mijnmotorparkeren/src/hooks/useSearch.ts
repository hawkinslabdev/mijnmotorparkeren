import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Fuse from 'fuse.js'
import { useGemeenteData } from './useGemeenteData'
import type { Gemeente } from '@/types/gemeente'
import type { CityLite } from '@/types/city'
import { fetchCityIndex } from '@/data/index'

export type SearchItem = Gemeente | CityLite

export const isCityItem = (item: SearchItem): item is CityLite => 'parent' in item

interface UseSearchReturn {
  results: SearchItem[]
  isSearching: boolean
  error: string | null
  search: (query: string) => void
  clearResults: () => void
}

const SEARCH_OPTIONS = {
  keys: [
    { name: 'name', weight: 0.7 },
    { name: 'province', weight: 0.3 },
    { name: 'alternativeNames', weight: 0.5 },
  ],
  threshold: 0.3,
  includeScore: true,
  minMatchCharLength: 1,
  ignoreLocation: true,
  shouldSort: true,
}

export function useSearch(): UseSearchReturn {
  const { gemeentes, loading: dataLoading } = useGemeenteData()

  const [cities, setCities] = useState<CityLite[]>([])
  const [results, setResults] = useState<SearchItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentQuery, setCurrentQuery] = useState('')

  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  useEffect(() => {
    fetchCityIndex()
      .then((list) => {
        if (isMounted.current) setCities(list)
      })
      // Gemeentes stay searchable without cities
      .catch(() => {})
  }, [])

  const fuse = useMemo(() => {
    if (!gemeentes || dataLoading || !Array.isArray(gemeentes) || gemeentes.length === 0) {
      return null
    }

    return new Fuse<SearchItem>([...gemeentes, ...cities], SEARCH_OPTIONS)
  }, [gemeentes, cities, dataLoading])

  const search = useCallback(
    (query: string): void => {
      if (!isMounted.current) return
      if (query === currentQuery) return

      setCurrentQuery(query)

      if (!fuse) {
        setError('Zoeken is nog niet beschikbaar. Probeer het zo opnieuw.')
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

          const searchedResults: SearchItem[] = searchResults
            .slice(0, 10)
            .map((result) => result.item)

          if (isMounted.current) {
            setResults(searchedResults)
          }
        } catch (err) {
          if (isMounted.current) {
            setError('Zoeken is mislukt. Probeer het opnieuw.')
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

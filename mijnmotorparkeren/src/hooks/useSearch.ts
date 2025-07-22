// src/hooks/useSearch.ts
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Fuse from 'fuse.js'
import { useGemeenteData } from './useGemeenteData'
import { Gemeente } from '@/types/gemeente'

interface UseSearchReturn {
  results: Gemeente[]
  isSearching: boolean
  error: string | null
  search: (query: string) => void
  clearResults: () => void
}

// Fuse.js search options
const SEARCH_OPTIONS = {
  keys: [
    { name: 'name', weight: 0.7 },
    { name: 'province', weight: 0.3 }
  ],
  threshold: 0.3,
  includeScore: true,
  minMatchCharLength: 1,
  ignoreLocation: true,
  shouldSort: true
}

export function useSearch(): UseSearchReturn {
  const { gemeentes, loading: dataLoading } = useGemeenteData()
  
  const [results, setResults] = useState<Gemeente[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentQuery, setCurrentQuery] = useState('')
  
  // Use ref to track if component is mounted
  const isMounted = useRef(true)
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  // Create Fuse instance when data is loaded
  const fuse = useMemo(() => {
    if (!gemeentes || dataLoading || !Array.isArray(gemeentes) || gemeentes.length === 0) {
      return null
    }

    console.log(`Creating Fuse instance with ${gemeentes.length} gemeentes`)
    return new Fuse(gemeentes, SEARCH_OPTIONS)
  }, [gemeentes, dataLoading])

  // Search function, rewritten to prevent infinite loops
  const search = useCallback((query: string): void => {
    // Don't search if component is unmounted
    if (!isMounted.current) return
    
    // Don't search if query hasn't changed
    if (query === currentQuery) return
    
    setCurrentQuery(query)
    
    if (!fuse) {
      setError('Search not available, data still loading')
      setResults([])
      return
    }

    if (!query.trim()) {
      // Show first 8 gemeentes when no query (like recent searches)
      setResults(gemeentes.slice(0, 8))
      setError(null)
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    setError(null)

    // Use setTimeout to debounce and prevent blocking
    setTimeout(() => {
      if (!isMounted.current) return
      
      try {
        const searchResults = fuse.search(query)
        
        // Extract and sort results
        const searchedResults: Gemeente[] = searchResults
          .slice(0, 10) // Limit to top 10 results
          .map(result => result.item)

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
    }, 100) // Small debounce delay
  }, [fuse, gemeentes, currentQuery])

  // Clear results function
  const clearResults = useCallback(() => {
    if (!isMounted.current) return
    
    setResults([])
    setError(null)
    setIsSearching(false)
    setCurrentQuery('')
  }, [])

  // Clear results when data is loading
  useEffect(() => {
    if (dataLoading) {
      clearResults()
    }
  }, [dataLoading, clearResults])

  // Initialize with some results when data loads
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
    clearResults
  }
}
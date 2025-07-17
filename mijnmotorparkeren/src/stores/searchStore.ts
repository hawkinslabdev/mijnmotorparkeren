// src/stores/searchStore.ts

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SearchResult {
  id: string
  name: string
  province: string
  coordinates: {
    lat: number
    lng: number
  }
}

interface SearchState {
  // Search state
  query: string
  results: SearchResult[]
  isSearching: boolean
  isOpen: boolean
  
  // Recent searches
  recentSearches: SearchResult[]
  
  // Suggestions
  suggestions: string[]
  
  // Actions
  setQuery: (query: string) => void
  setResults: (results: SearchResult[]) => void
  setSearching: (searching: boolean) => void
  setOpen: (open: boolean) => void
  
  // Recent searches management
  addRecentSearch: (result: SearchResult) => void
  clearRecentSearches: () => void
  
  // Suggestions
  setSuggestions: (suggestions: string[]) => void
  
  // Utility actions
  selectResult: (result: SearchResult) => void
  clearSearch: () => void
}

const MAX_RECENT_SEARCHES = 5

export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      // Initial state
      query: '',
      results: [],
      isSearching: false,
      isOpen: false,
      recentSearches: [],
      suggestions: [],

      // Basic setters
      setQuery: (query) => set({ query }),
      setResults: (results) => set({ results }),
      setSearching: (searching) => set({ isSearching: searching }),
      setOpen: (open) => set({ isOpen: open }),
      setSuggestions: (suggestions) => set({ suggestions }),

      // Recent searches management
      addRecentSearch: (result) => {
        const { recentSearches } = get()
        
        // Remove if already exists
        const filtered = recentSearches.filter(item => item.id !== result.id)
        
        // Add to front and limit to MAX_RECENT_SEARCHES
        const updated = [result, ...filtered].slice(0, MAX_RECENT_SEARCHES)
        
        set({ recentSearches: updated })
      },

      clearRecentSearches: () => set({ recentSearches: [] }),

      // Complex actions
      selectResult: (result) => {
        const { addRecentSearch } = get()
        
        // Add to recent searches
        addRecentSearch(result)
        
        // Clear search and close
        set({
          query: '',
          results: [],
          isOpen: false
        })
      },

      clearSearch: () => {
        set({
          query: '',
          results: [],
          isSearching: false
        })
      }
    }),
    {
      name: 'search-store',
      partialize: (state) => ({
        recentSearches: state.recentSearches
      })
    }
  )
)
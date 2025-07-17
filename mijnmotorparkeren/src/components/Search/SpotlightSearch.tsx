// src/components/Search/SpotlightSearch.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Gemeente } from '@/types/gemeente'
import { useSearch } from '@/hooks/useSearch'
import { getParkingStatus, hasDedicatedMotorcycleSpots } from '@/utils/gemeenteUtils'
import { clsx } from 'clsx'

interface SpotlightSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (gemeente: Gemeente) => void
}

export const SpotlightSearch: React.FC<SpotlightSearchProps> = ({
  open,
  onOpenChange,
  onSelect
}) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const { results, isSearching, error, search, clearResults } = useSearch()

  // Stable search callback to prevent infinite loops
  const performSearch = useCallback((searchQuery: string) => {
    search(searchQuery)
  }, [search])

  // Perform search when query changes
  useEffect(() => {
    performSearch(query)
    setSelectedIndex(0)
  }, [query, performSearch])

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setQuery('')
      clearResults()
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery('')
      setSelectedIndex(0)
    }
  }, [open, clearResults])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        onOpenChange(false)
        break
    }
  }

  const handleSelect = (gemeente: Gemeente) => {
    onSelect(gemeente)
    onOpenChange(false)
    setQuery('')
    setSelectedIndex(0)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-9999" />
        <Dialog.Content className="fixed top-[10%] left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white rounded-xl shadow-2xl z-10000 max-h-[80vh] overflow-hidden">
          {/* Accessibility: Hidden title for screen readers */}
          <VisuallyHidden>
            <Dialog.Title>Gemeente zoeken</Dialog.Title>
          </VisuallyHidden>
          
          {/* Accessibility: Hidden description for screen readers */}
          <VisuallyHidden>
            <Dialog.Description>
              Zoek een gemeente om parkeerregels en informatie te bekijken.
            </Dialog.Description>
          </VisuallyHidden>
          
          <div className="flex items-center border-b border-gray-200 px-4">
            <svg
              className="w-5 h-5 text-gray-400 mr-3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="Zoek gemeente..."
              className="flex-1 py-4 text-lg outline-none"
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              aria-label="Zoek naar gemeente"
              aria-describedby="search-results"
            />
            {isSearching && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            )}
            <Dialog.Close className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Dialog.Close>
          </div>
          
          <div className="overflow-y-auto max-h-[60vh]" id="search-results">
            {error && (
              <div className="p-4 text-center text-red-500 bg-red-50 border-b border-red-100">
                {error}
              </div>
            )}
            
            {!error && results.length === 0 && !isSearching && (
              <div className="p-8 text-center text-gray-500">
                {query.trim() ? 'Geen gemeentes gevonden' : 'Typ om te zoeken...'}
              </div>
            )}
            
            {!error && results.length > 0 && (
              <ul className="py-2" role="listbox" aria-label="Search results">
                {results.map((gemeente, index) => (
                  <li key={gemeente.id} role="option" aria-selected={index === selectedIndex}>
                    <button
                      className={clsx(
                        'w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors',
                        index === selectedIndex && 'bg-blue-50'
                      )}
                      onClick={() => handleSelect(gemeente)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      aria-describedby={`gemeente-${gemeente.id}`}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {gemeente.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {gemeente.province}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {/* Parking status indicator */}
                        {(() => {
                          const parkingStatus = getParkingStatus(gemeente)
                          return (
                            <div className={clsx('px-2 py-1 text-xs rounded-full', parkingStatus.colorClass)}>
                              {parkingStatus.label}
                            </div>
                          )
                        })()}
                        
                        {/* Motorcycle spots indicator */}
                        {hasDedicatedMotorcycleSpots(gemeente) && (
                          <div className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                            🏍️ Plekken
                          </div>
                        )}
                        
                        <svg
                          className="w-4 h-4 text-gray-400"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          {/* Footer with keyboard shortcuts */}
          <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">↑↓</kbd>
                  <span className="ml-1">Navigeren</span>
                </div>
                <div className="flex items-center">
                  <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">Enter</kbd>
                  <span className="ml-1">Selecteren</span>
                </div>
                <div className="flex items-center">
                  <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">Esc</kbd>
                  <span className="ml-1">Sluiten</span>
                </div>
              </div>
              {results.length > 0 && (
                <span>{results.length} resultaat{results.length !== 1 ? 'en' : ''}</span>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
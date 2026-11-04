import React, { useState, useEffect, useRef, useCallback } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import type { Gemeente } from '@/types/gemeente'
import { isCityItem, useSearch, type SearchItem } from '@/hooks/useSearch'
import { getParkingStatus, hasDedicatedMotorcycleSpots } from '@/utils/gemeenteUtils'
import { clsx } from 'clsx'

interface SpotlightSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (item: SearchItem) => void
}

export const SpotlightSearch: React.FC<SpotlightSearchProps> = ({
  open,
  onOpenChange,
  onSelect,
}) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [keyboardInset, setKeyboardInset] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const selectionMade = useRef(false)

  const { results, isSearching, error, search, clearResults } = useSearch()

  const performSearch = useCallback(
    (searchQuery: string) => {
      search(searchQuery)
    },
    [search]
  )

  useEffect(() => {
    performSearch(query)
    setSelectedIndex(0)
  }, [query, performSearch])

  useEffect(() => {
    if (open) {
      setQuery('')
      clearResults()
      selectionMade.current = false
    } else {
      setQuery('')
      setSelectedIndex(0)
    }
  }, [open, clearResults])

  // Keep the sheet above the keyboard
  useEffect(() => {
    const viewport = window.visualViewport
    if (!open || !viewport) return
    const update = () =>
      setKeyboardInset(
        Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop))
      )
    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
    }
  }, [open])

  useEffect(() => {
    listRef.current?.children[selectedIndex]?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
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

  const handleSelect = (item: SearchItem) => {
    selectionMade.current = true
    onSelect(item)
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
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-[9999]" />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 sm:bottom-auto sm:top-[10%] sm:left-1/2 sm:-translate-x-1/2 w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-xl shadow-2xl z-[10000] max-h-[85vh] sm:max-h-[80vh] overflow-hidden flex flex-col"
          style={
            keyboardInset > 0
              ? { bottom: keyboardInset, maxHeight: `calc(100dvh - ${keyboardInset}px - 1rem)` }
              : undefined
          }
          onCloseAutoFocus={(e) => {
            // Panel takes focus after selection
            if (selectionMade.current) e.preventDefault()
          }}
        >
          {/* Accessibility: Hidden title for screen readers */}
          <VisuallyHidden>
            <Dialog.Title>Gemeente of stad zoeken</Dialog.Title>
          </VisuallyHidden>

          {/* Accessibility: Hidden description for screen readers */}
          <VisuallyHidden>
            <Dialog.Description>
              Zoek een gemeente of stad om parkeerregels en informatie te bekijken.
            </Dialog.Description>
          </VisuallyHidden>

          <div className="flex flex-shrink-0 items-center border-b border-gray-200 px-4">
            <svg
              className="w-5 h-5 text-gray-500 mr-3"
              aria-hidden="true"
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
              role="combobox"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              placeholder="Zoek gemeente of stad..."
              className="flex-1 py-4 text-lg outline-none placeholder:text-gray-500"
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              aria-label="Zoek naar gemeente of stad"
              aria-autocomplete="list"
              aria-expanded={results.length > 0}
              aria-controls={results.length > 0 ? 'search-results' : undefined}
              aria-activedescendant={
                results[selectedIndex] ? `search-option-${selectedIndex}` : undefined
              }
            />
            {isSearching && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            )}
            <Dialog.Close
              className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Sluiten"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                aria-hidden="true"
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

          <div role="status" className="sr-only">
            {!isSearching && query.trim()
              ? results.length > 0
                ? `${results.length} ${results.length === 1 ? 'resultaat' : 'resultaten'}`
                : 'Geen resultaten gevonden'
              : ''}
          </div>

          <div className="grow min-h-0 overflow-y-auto">
            {error && (
              <div className="p-4 text-center text-red-500 bg-red-50 border-b border-red-100">
                {error}
              </div>
            )}

            {!error && results.length === 0 && !isSearching && (
              <div className="p-8 text-center text-gray-500">
                {query.trim() ? 'Geen resultaten gevonden' : 'Typ om te zoeken...'}
              </div>
            )}

            {!error && results.length > 0 && (
              <ul
                ref={listRef}
                className="py-2"
                id="search-results"
                role="listbox"
                aria-label="Zoekresultaten"
              >
                {results.map((item, index) => {
                  const city = isCityItem(item)
                  const parkingStatus = city ? null : getParkingStatus(item)
                  return (
                    <li
                      key={`${city ? 'city' : 'gemeente'}-${item.id}`}
                      id={`search-option-${index}`}
                      role="option"
                      aria-selected={index === selectedIndex}
                      className={clsx(
                        'w-full cursor-pointer text-left px-4 py-3 flex items-center justify-between gap-2 hover:bg-gray-50 transition-colors',
                        index === selectedIndex && 'bg-blue-50'
                      )}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-500">{item.province}</div>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {/* Parking status indicator */}
                        <div
                          className={clsx(
                            'px-2 py-1 text-xs rounded-full',
                            parkingStatus?.colorClass ?? 'bg-indigo-100 text-indigo-800'
                          )}
                        >
                          {parkingStatus?.label ?? 'Eigen regels'}
                        </div>

                        {/* Motorcycle spots indicator */}
                        {!city && hasDedicatedMotorcycleSpots(item as Gemeente) && (
                          <div className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                            🏍️ Plekken
                          </div>
                        )}

                        <svg
                          className="w-4 h-4 text-gray-500"
                          aria-hidden="true"
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
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Footer with keyboard shortcuts */}
          <div className="hidden sm:block flex-shrink-0 border-t border-gray-200 px-4 py-3 bg-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">
                    ↑↓
                  </kbd>
                  <span className="ml-1">Navigeren</span>
                </div>
                <div className="flex items-center">
                  <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">
                    Enter
                  </kbd>
                  <span className="ml-1">Selecteren</span>
                </div>
                <div className="flex items-center">
                  <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">
                    Esc
                  </kbd>
                  <span className="ml-1">Sluiten</span>
                </div>
              </div>
              {results.length > 0 && (
                <span>
                  {results.length} resultaat{results.length !== 1 ? 'en' : ''}
                </span>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

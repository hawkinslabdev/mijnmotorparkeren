import React, { useState, useEffect, useRef, useCallback } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Check, Euro, MapPin, Minus, Search, X } from 'lucide-react'
import { isCityItem, useSearch, type SearchItem } from '@/hooks/useSearch'
import { getParkingStatus } from '@/utils/gemeenteUtils'
import { clsx } from 'clsx'

// Same status language as the panel
const STATUS_DISPLAY = {
  sidewalk_allowed: { icon: Check, tone: 'text-green-800' },
  free_parking: { icon: Check, tone: 'text-green-800' },
  paid_parking: { icon: Euro, tone: 'text-amber-800' },
  no_info: { icon: Minus, tone: 'text-gray-600' },
}
const CITY_DISPLAY = { icon: MapPin, tone: 'text-gray-900' }

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
  const dragStartY = useRef<number | null>(null)
  const [dragOffset, setDragOffset] = useState(0)

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
      setDragOffset(0)
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

  // Swipe down closes, like the panel
  const endDrag = (close: boolean) => {
    if (close && dragOffset > 80) onOpenChange(false)
    dragStartY.current = null
    setDragOffset(0)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-[9999]" />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 sm:bottom-auto sm:top-[10%] sm:left-1/2 sm:-translate-x-1/2 w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-xl shadow-2xl border-t border-gray-200 sm:border-none z-[10000] max-h-[85vh] sm:max-h-[80vh] overflow-hidden flex flex-col"
          style={{
            ...(keyboardInset > 0 && {
              bottom: keyboardInset,
              maxHeight: `calc(100dvh - ${keyboardInset}px - 1rem)`,
            }),
            ...(dragOffset > 0 && { transform: `translateY(${dragOffset}px)` }),
          }}
          onOpenAutoFocus={(e) => {
            // Input first, not the close button
            e.preventDefault()
            inputRef.current?.focus()
          }}
          onCloseAutoFocus={(e) => {
            // Panel takes focus after selection
            if (selectionMade.current) e.preventDefault()
          }}
        >
          {/* Accessibility: Hidden description for screen readers */}
          <VisuallyHidden>
            <Dialog.Description>
              Zoek een gemeente of stad om parkeerregels en informatie te bekijken.
            </Dialog.Description>
          </VisuallyHidden>

          <div
            className="flex-shrink-0 touch-none p-4 pb-3 sm:touch-auto sm:p-0"
            onTouchStart={(e) => {
              if (e.touches.length === 1) dragStartY.current = e.touches[0].clientY
            }}
            onTouchMove={(e) => {
              if (dragStartY.current === null) return
              setDragOffset(Math.max(0, e.touches[0].clientY - dragStartY.current))
            }}
            onTouchEnd={() => endDrag(true)}
            onTouchCancel={() => endDrag(false)}
          >
            <div className="mb-2 flex justify-center sm:hidden">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            <div className="mb-2 flex items-center justify-between sm:mb-0 sm:block">
              <Dialog.Title className="text-xl font-bold text-gray-900 sm:sr-only">
                Gemeente of stad zoeken
              </Dialog.Title>
              <Dialog.Close
                className="flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-gray-100 transition-colors sm:hidden"
                aria-label="Sluiten"
              >
                <X className="h-5 w-5 text-gray-600" aria-hidden="true" />
              </Dialog.Close>
            </div>

            <div className="flex items-center rounded-lg border border-gray-300 px-3 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 sm:rounded-none sm:border-0 sm:border-b sm:border-gray-200 sm:px-4 sm:focus-within:border-gray-200 sm:focus-within:ring-0">
              <Search className="mr-3 h-5 w-5 flex-none text-gray-500" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                enterKeyHint="search"
                autoComplete="off"
                autoCorrect="off"
                placeholder="Zoek gemeente of stad..."
                className="flex-1 py-3 text-base outline-none placeholder:text-gray-500 sm:py-4 sm:text-lg"
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
                className="hidden min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-gray-100 transition-colors sm:flex"
                aria-label="Sluiten"
              >
                <X className="h-5 w-5 text-gray-600" aria-hidden="true" />
              </Dialog.Close>
            </div>
          </div>

          <div role="status" className="sr-only">
            {!isSearching && query.trim()
              ? results.length > 0
                ? `${results.length} ${results.length === 1 ? 'resultaat' : 'resultaten'}`
                : 'Geen resultaten gevonden'
              : ''}
          </div>

          <div className="grow min-h-0 overflow-y-auto">
            {error && <p className="p-4 text-sm font-medium text-red-800">{error}</p>}

            {!error && results.length === 0 && !isSearching && (
              <p className="p-4 text-sm text-gray-600">
                {query.trim() ? 'Geen resultaten gevonden' : 'Typ om te zoeken...'}
              </p>
            )}

            {!error && results.length > 0 && (
              <ul
                ref={listRef}
                className="divide-y divide-gray-100"
                id="search-results"
                role="listbox"
                aria-label="Zoekresultaten"
              >
                {results.map((item, index) => {
                  const city = isCityItem(item)
                  const parkingStatus = city ? null : getParkingStatus(item)
                  const { icon: StatusIcon, tone } = parkingStatus
                    ? STATUS_DISPLAY[parkingStatus.status]
                    : CITY_DISPLAY
                  return (
                    <li
                      key={`${city ? 'city' : 'gemeente'}-${item.id}`}
                      id={`search-option-${index}`}
                      role="option"
                      aria-selected={index === selectedIndex}
                      className={clsx(
                        'flex cursor-pointer gap-3 px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors',
                        // Highlight is for keyboard users
                        index === selectedIndex && 'pointer-fine:bg-blue-50'
                      )}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <StatusIcon
                        className={clsx('mt-0.5 h-5 w-5 flex-none', tone)}
                        strokeWidth={2.5}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <div className="text-base font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-600">
                          <span className={clsx('font-medium', tone)}>
                            {parkingStatus?.label ?? 'Eigen regels'}
                          </span>
                          {item.province && ` · ${item.province}`}
                        </div>
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

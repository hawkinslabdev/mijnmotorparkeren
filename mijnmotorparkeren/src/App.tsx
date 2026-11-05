import React, { useEffect, useState, useRef, useCallback } from 'react'
import { ChevronUp } from 'lucide-react'
import { ToastProvider } from './components/Layout/Toast'
import { useToast } from './contexts/ToastContext'
import 'leaflet/dist/leaflet.css'
import '@fontsource-variable/inter/wght.css'
import MapView from '@components/Map/MapView'
import { SpotlightSearch } from '@components/Search/SpotlightSearch'
import { ParkingRules } from '@components/Info/ParkingRules'
import { POIDetails, POIDot } from '@components/Info/POIDetails'
import { Header } from '@components/Layout/Header'
import { PromoBar } from '@components/Layout/PromoBar'
import { useMapStore } from '@stores/mapStore'
import { useGemeenteData } from '@hooks/useGemeenteData'
import { useKeyboardShortcuts } from '@hooks/useKeyboardShortcuts'
import type { Gemeente } from './types/gemeente'
import { type City } from './types/city'
import type { POI } from './types/poi'
import { fetchFullCity, fetchMunicipalityPOIs } from './data/index'
import { isCityItem, type SearchItem } from '@hooks/useSearch'
import { isBottomSheet } from './utils/mapUtils'

import L from 'leaflet'
import icon from 'leaflet/dist/images/marker-icon.png?url'
import iconShadow from 'leaflet/dist/images/marker-shadow.png?url'

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

interface AppProps {
  initialGemeenteId?: string
  initialCityId?: string
  initialPlaceName?: string
}

const MESSAGES = {
  LOAD_ERROR: 'Kan parkeerregels niet laden. Controleer je internetverbinding.',
  OFFLINE: 'Je bent offline. Gelezen regels zijn mogelijk verouderd.',
  RETRY: 'Probeer het opnieuw',
}

const AppContent: React.FC<AppProps> = ({ initialGemeenteId, initialCityId, initialPlaceName }) => {
  const [selectedGemeente, setSelectedGemeente] = useState<Gemeente | null>(null)
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null)
  const [poiPeeked, setPoiPeeked] = useState(false)
  const poiPeek = poiPeeked && !!selectedPOI
  const [searchOpen, setSearchOpen] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [panelPOIs, setPanelPOIs] = useState<POI[]>([])
  // Only while on the place URL
  const [placeName, setPlaceName] = useState(initialPlaceName)
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' && navigator.onLine === false
  )

  const detailsRef = useRef<HTMLDivElement>(null)
  const panelTouchStartY = useRef<number | null>(null)
  const swipeOffsetRef = useRef(0)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const panelWasOpen = useRef(false)
  const selectedGemeenteRef = useRef<Gemeente | null>(null)
  const selectedCityRef = useRef<City | null>(null)
  // POI id captured from ?poi=<id> at load; consumed once the parent loads.
  const pendingPoiId = useRef<string | null>(
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('poi') : null
  )

  // POI links own the initial view
  const [openedOnPOI] = useState(() => !!pendingPoiId.current)

  const { showToast } = useToast()
  const { setSelectedGemeente: setSelectedGemeenteId, focusOnGemeente, resetView } = useMapStore()
  const { gemeentes, loading, error: indexError, loadFullGemeente } = useGemeenteData()

  useEffect(() => {
    if (indexError) showToast(MESSAGES.LOAD_ERROR, 6000)
  }, [indexError, showToast])

  useEffect(() => {
    if (initialGemeenteId || initialCityId) return
    if (!('geolocation' in navigator)) return

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        focusOnGemeente([pos.coords.latitude, pos.coords.longitude], 13)
      },
      () => {
        /* denied or unavailable — keep configured defaults */
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 5 * 60 * 1000 }
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!initialGemeenteId || gemeentes.length === 0) return
    const lite = gemeentes.find((g) => g.id === initialGemeenteId)
    if (!lite) return

    setSelectedGemeenteId(lite.id)
    if (lite.coordinates) {
      const zoom = typeof lite.zoom === 'number' ? lite.zoom : 12
      focusOnGemeente([lite.coordinates.lat, lite.coordinates.lng], zoom)
    }

    setDetailsLoading(true)
    loadFullGemeente(initialGemeenteId)
      .then((full) => {
        if (full) setSelectedGemeente(full)
        else showToast(MESSAGES.LOAD_ERROR, 6000)
      })
      .finally(() => setDetailsLoading(false))
  }, [
    initialGemeenteId,
    gemeentes,
    setSelectedGemeenteId,
    focusOnGemeente,
    loadFullGemeente,
    showToast,
  ])

  useEffect(() => {
    if (!initialCityId) return
    setDetailsLoading(true)
    fetchFullCity(initialCityId)
      .then((city) => {
        setSelectedCity(city)
        if (city.coordinates) focusOnGemeente([city.coordinates.lat, city.coordinates.lng], 12)
      })
      .catch((error) => {
        console.error(error)
        showToast(MESSAGES.LOAD_ERROR, 6000)
      })
      .finally(() => setDetailsLoading(false))
  }, [initialCityId, focusOnGemeente, showToast])

  useKeyboardShortcuts([
    { key: 'k', ctrlKey: true, callback: () => setSearchOpen(true) },
    { key: 'k', metaKey: true, callback: () => setSearchOpen(true) },
    { key: '/', callback: () => setSearchOpen(true) },
    {
      key: 'Escape',
      callback: () => {
        setSearchOpen(false)
        handleDetailsClose()
      },
    },
  ])

  const handleGemeenteSelect = useCallback(
    async (lite: Gemeente | null) => {
      setSelectedPOI(null)
      setPlaceName(undefined)
      if (!lite) {
        setSelectedGemeente(null)
        setSelectedCity(null)
        setSelectedGemeenteId(null)
        return
      }

      setSelectedCity(null)
      setSelectedGemeenteId(lite.id)
      const urlBase = lite.type === 'country' ? '/countries' : '/gemeente'
      window.history.pushState({}, '', `${urlBase}/${lite.id}`)

      if (lite.coordinates) {
        const zoom = typeof lite.zoom === 'number' ? lite.zoom : 12
        focusOnGemeente([lite.coordinates.lat, lite.coordinates.lng], zoom)
      }

      setDetailsLoading(true)
      const full = await loadFullGemeente(lite.id)
      if (!full) showToast(MESSAGES.LOAD_ERROR, 6000)
      setSelectedGemeente(full ?? lite)
      setDetailsLoading(false)
    },
    [setSelectedGemeenteId, focusOnGemeente, loadFullGemeente, showToast]
  )

  const handleCitySelect = useCallback(
    async (city: City | null) => {
      setSelectedPOI(null)
      setPlaceName(undefined)
      if (!city) {
        setSelectedCity(null)
        setSelectedGemeente(null)
        setSelectedGemeenteId(null)
        return
      }
      setSelectedGemeente(null)
      setSelectedGemeenteId(null)
      window.history.pushState({}, '', `/stad/${city.id}`)
      if (city.coordinates) focusOnGemeente([city.coordinates.lat, city.coordinates.lng], 12)
      setSelectedCity(city)
    },
    [setSelectedGemeenteId, focusOnGemeente]
  )

  const handleSearchSelect = useCallback(
    async (item: SearchItem, place?: string) => {
      setSearchOpen(false)
      if (!isCityItem(item)) {
        handleGemeenteSelect(item)
        setPlaceName(place)
        return
      }
      setSelectedPOI(null)
      setDetailsLoading(true)
      try {
        await handleCitySelect(await fetchFullCity(item.id))
        setPlaceName(place)
      } catch {
        showToast(MESSAGES.LOAD_ERROR, 6000)
      } finally {
        setDetailsLoading(false)
      }
    },
    [handleGemeenteSelect, handleCitySelect, showToast]
  )

  const handlePOISelect = useCallback(
    (poi: POI) => {
      setSelectedPOI(poi)
      setPoiPeeked(false)
      focusOnGemeente([poi.coordinates.lat, poi.coordinates.lng], 17)
      // Make the POI shareable via ?poi=<id> on the current gemeente/city path.
      const base = window.location.pathname
      window.history.pushState({}, '', `${base}?poi=${encodeURIComponent(poi.id)}`)
    },
    [focusOnGemeente]
  )

  useEffect(() => {
    selectedGemeenteRef.current = selectedGemeente
  }, [selectedGemeente])

  useEffect(() => {
    selectedCityRef.current = selectedCity
  }, [selectedCity])

  const handlePOIClose = useCallback(() => {
    setSelectedPOI(null)
    // Drop the ?poi param — go back to the parent gemeente/city view.
    window.history.pushState({}, '', window.location.pathname)
    const parent = selectedCityRef.current ?? selectedGemeenteRef.current
    if (parent?.coordinates) {
      const zoom = 'zoom' in parent && typeof parent.zoom === 'number' ? parent.zoom : 12
      focusOnGemeente([parent.coordinates.lat, parent.coordinates.lng], zoom)
    }
  }, [focusOnGemeente])

  // Deep-link: open a POI from ?poi=<id> once its parent gemeente/city is loaded.
  useEffect(() => {
    const poiId = pendingPoiId.current
    if (!poiId) return
    const scope = selectedCity ? 'city' : selectedGemeente ? 'gemeente' : null
    const municipalityId = selectedCity?.id ?? selectedGemeente?.id
    if (!scope || !municipalityId) return
    pendingPoiId.current = null
    fetchMunicipalityPOIs(municipalityId, scope)
      .then((pois) => {
        const poi = pois.find((p) => p.id === poiId)
        if (poi) {
          setSelectedPOI(poi)
          focusOnGemeente([poi.coordinates.lat, poi.coordinates.lng], 17)
        }
      })
      .catch(() => {})
  }, [selectedGemeente, selectedCity, focusOnGemeente])

  // List map POIs in the panel
  useEffect(() => {
    const scope = selectedCity ? 'city' : selectedGemeente ? 'gemeente' : null
    const municipalityId = selectedCity?.id ?? selectedGemeente?.id
    if (!scope || !municipalityId) {
      setPanelPOIs([])
      return
    }
    let stale = false
    fetchMunicipalityPOIs(municipalityId, scope)
      .then((pois) => {
        if (!stale) setPanelPOIs(pois)
      })
      .catch(() => {
        if (!stale) setPanelPOIs([])
      })
    return () => {
      stale = true
    }
  }, [selectedGemeente, selectedCity])

  useEffect(() => {
    const update = () => setIsOffline(!navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  const panelTitle = selectedPOI?.name ?? selectedCity?.name ?? selectedGemeente?.name ?? null

  // Move focus to opened panel
  useEffect(() => {
    if (loading || detailsLoading) return
    if (panelTitle) {
      const active = document.activeElement
      if (
        active instanceof HTMLElement &&
        active !== document.body &&
        !detailsRef.current?.contains(active)
      ) {
        returnFocusRef.current = active
      }
      detailsRef.current?.focus({ preventScroll: true })
      panelWasOpen.current = true
      // Keep this page for offline reload
      navigator.serviceWorker?.controller?.postMessage({
        type: 'CACHE_URLS',
        urls: [location.pathname + location.search],
      })
    } else if (panelWasOpen.current) {
      panelWasOpen.current = false
      if (document.activeElement === document.body) {
        const target = returnFocusRef.current?.isConnected
          ? returnFocusRef.current
          : document.getElementById('search-button')
        target?.focus({ preventScroll: true })
      }
      returnFocusRef.current = null
    }
  }, [panelTitle, loading, detailsLoading])

  // Closing keeps the current view
  const handleDetailsClose = useCallback(() => {
    setPlaceName(undefined)
    setSelectedGemeente(null)
    setSelectedCity(null)
    setSelectedPOI(null)
    setSelectedGemeenteId(null)
    window.history.pushState({}, '', '/')
  }, [setSelectedGemeenteId])

  const handleReset = useCallback(() => {
    handleDetailsClose()
    resetView()
  }, [handleDetailsClose, resetView])

  const setPOIPeek = useCallback(
    (peek: boolean) => {
      if (!selectedPOI) return
      // Keep focus out of hidden content
      detailsRef.current?.focus({ preventScroll: true })
      setPoiPeeked(peek)
      // Recentre above the resized sheet
      focusOnGemeente([selectedPOI.coordinates.lat, selectedPOI.coordinates.lng], 17)
    },
    [selectedPOI, focusOnGemeente]
  )

  const handlePanelTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    const el = e.currentTarget as HTMLElement
    if (el.scrollTop === 0) {
      panelTouchStartY.current = e.touches[0].clientY
    }
  }, [])

  // iOS Safari registers touch listeners as passive by default, which prevents
  // preventDefault() from blocking pull-to-refresh. We attach a non-passive
  // native listener in useEffect instead (see below).

  const handlePanelTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const startY = panelTouchStartY.current
      const swipedDown = swipeOffsetRef.current > 80
      if (selectedPOI && isBottomSheet()) {
        const swipedUp = startY !== null && startY - e.changedTouches[0].clientY > 30
        if (poiPeek ? swipedUp : swipedDown) setPOIPeek(!poiPeek)
      } else if (swipedDown) {
        handleDetailsClose()
      }
      swipeOffsetRef.current = 0
      setSwipeOffset(0)
      panelTouchStartY.current = null
    },
    [handleDetailsClose, selectedPOI, poiPeek, setPOIPeek]
  )

  const [shareLoading, setShareLoading] = useState(false)
  const [shareResult, setShareResult] = useState<string | null>(null)
  const shareResetTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const handleShare = async () => {
    setShareLoading(true)
    clearTimeout(shareResetTimer.current)
    setShareResult(null)
    // Let the arrow finish lifting
    const lift = new Promise((resolve) => setTimeout(resolve, 240))
    try {
      const shareUrl = window.location.href
      let title = 'MijnMotorParkeren.nl'
      let text = 'Bekijk het parkeerbeleid voor jouw motor in Nederlandse gemeenten'
      if (selectedPOI) {
        title = selectedPOI.name
        text = `Bekijk motorparkeerplek "${selectedPOI.name}" op MijnMotorParkeren.nl`
      } else if (selectedCity) {
        title = `Parkeerregels in ${selectedCity.name}`
        text = `Bekijk de parkeerregels voor ${selectedCity.name} (gemeente ${selectedCity.parent}) op MijnMotorParkeren.nl`
      } else if (selectedGemeente) {
        title = `Parkeerregels in ${selectedGemeente.name}`
        text = `Bekijk de parkeerregels voor ${selectedGemeente.name} op MijnMotorParkeren.nl`
      }
      const shareData = { title, text, url: shareUrl }
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData)
        await lift
        setShareResult('Gedeeld')
      } else {
        await navigator.clipboard.writeText(shareUrl)
        await lift
        setShareResult('Link gekopieerd')
      }
      shareResetTimer.current = setTimeout(() => setShareResult(null), 1800)
    } catch (error) {
      // Closing the share sheet isn't an error
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.error('Error sharing:', error)
        showToast(`Delen is niet gelukt. ${MESSAGES.RETRY}.`, 6000)
      }
    } finally {
      setShareLoading(false)
    }
  }

  useEffect(() => {
    let downX = 0
    let downY = 0

    const handleMouseDown = (event: MouseEvent) => {
      downX = event.clientX
      downY = event.clientY
    }

    const handleClick = (event: MouseEvent) => {
      const dx = event.clientX - downX
      const dy = event.clientY - downY
      if (Math.sqrt(dx * dx + dy * dy) > 5) return

      const shareBtn = document.getElementById('mobile-share-btn')
      if (shareBtn?.contains(event.target as Node)) return
      if (detailsRef.current && !detailsRef.current.contains(event.target as Node)) {
        const mapContainer = document.querySelector('.leaflet-container')
        if (mapContainer?.contains(event.target as Node)) {
          if (selectedPOI) {
            handlePOIClose()
          } else {
            handleDetailsClose()
          }
        }
      }
    }

    if (selectedGemeente || selectedCity) {
      document.addEventListener('mousedown', handleMouseDown)
      document.addEventListener('click', handleClick)
      return () => {
        document.removeEventListener('mousedown', handleMouseDown)
        document.removeEventListener('click', handleClick)
      }
    }
  }, [selectedGemeente, selectedCity, selectedPOI, handleDetailsClose, handlePOIClose])

  useEffect(() => {
    const el = detailsRef.current
    if (!el) return
    const onTouchMove = (e: TouchEvent) => {
      if (panelTouchStartY.current === null) return
      const delta = e.touches[0].clientY - panelTouchStartY.current
      if (delta > 0) {
        e.preventDefault()
        if (poiPeek) return
        swipeOffsetRef.current = delta
        setSwipeOffset(delta)
      }
    }
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => el.removeEventListener('touchmove', onTouchMove)
  }, [selectedGemeente, selectedCity, detailsLoading, poiPeek])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div role="status" className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Gemeentes laden...</p>
        </div>
      </div>
    )
  }

  const detailsOpen = Boolean(selectedGemeente || selectedCity || detailsLoading)

  return (
    <div className="h-dvh flex flex-col bg-gray-50">
      <PromoBar />
      <Header onSearchOpen={() => setSearchOpen(true)} />

      <main className="flex-1 relative overflow-hidden">
        <div role="status" className="sr-only">
          {[detailsLoading && 'Parkeerregels laden', isOffline && MESSAGES.OFFLINE, shareResult]
            .filter(Boolean)
            .join('. ')}
        </div>

        <MapView
          gemeentes={gemeentes}
          onGemeenteSelect={handleGemeenteSelect}
          onCitySelect={handleCitySelect}
          onPOISelect={handlePOISelect}
          onReset={handleReset}
          selectedGemeente={selectedGemeente}
          selectedCity={selectedCity}
          poiActive={!!selectedPOI}
          detailsOpen={detailsOpen}
          autoFitGemeenteId={openedOnPOI ? null : (initialGemeenteId ?? null)}
          pois={panelPOIs}
        />

        <SpotlightSearch
          open={searchOpen}
          onOpenChange={setSearchOpen}
          onSelect={handleSearchSelect}
        />

        {isOffline && (
          <div className="absolute top-3 left-3 z-[1000] max-w-[calc(100%-5.5rem)] rounded-lg bg-gray-900 px-3 py-2 text-sm text-white shadow-lg">
            {MESSAGES.OFFLINE}
          </div>
        )}

        {detailsOpen && (
          <div
            ref={detailsRef}
            role="region"
            aria-label={panelTitle ? `Parkeerregels: ${panelTitle}` : 'Parkeerregels laden'}
            aria-busy={detailsLoading}
            tabIndex={-1}
            data-poi-sheet={selectedPOI ? '' : undefined}
            className="outline-none absolute bottom-0 sm:bottom-4 left-0 sm:left-auto w-full right-0 sm:right-4 bg-white rounded-t-2xl sm:rounded-xl shadow-2xl px-4 pt-4 max-w-full sm:max-w-sm z-[1001] border-t border-gray-200 sm:border-none max-h-[min(75vh,100%)] sm:max-h-[calc(100%-2rem)] overflow-y-auto [overscroll-behavior-y:contain] [animation:slide-up_0.3s_ease-out] sm:[animation:none]"
            style={{
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              transform: swipeOffset > 0 ? `translateY(${swipeOffset}px)` : undefined,
              transition: swipeOffset > 0 ? 'none' : 'transform 0.3s ease-out',
            }}
            onTouchStart={handlePanelTouchStart}
            onTouchEnd={handlePanelTouchEnd}
          >
            {selectedPOI && !detailsLoading ? (
              <button
                type="button"
                onClick={() => setPOIPeek(!poiPeek)}
                aria-expanded={!poiPeek}
                aria-controls="panel-content"
                aria-label={`Details van ${selectedPOI.name}`}
                className="sm:hidden -mt-2 flex min-h-11 w-full flex-col items-center gap-2 rounded-lg pt-2 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <span className="w-12 h-1.5 bg-gray-500 rounded-full" />
                {poiPeek && (
                  <span className="flex max-w-full items-center gap-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-base font-semibold text-gray-900">
                    <POIDot type={selectedPOI.type} className="w-2.5 h-2.5" />
                    <span className="truncate">{selectedPOI.name}</span>
                    <ChevronUp className="h-4 w-4 flex-none text-gray-600" aria-hidden="true" />
                  </span>
                )}
              </button>
            ) : (
              <div className="sm:hidden flex justify-center mb-2">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
              </div>
            )}

            <div id="panel-content" className={poiPeek ? 'max-sm:hidden' : undefined}>
              {detailsLoading ? (
                <div className="animate-pulse space-y-3 pt-2 pb-6">
                  <div className="h-6 bg-gray-200 rounded w-2/3" />
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-16 bg-gray-200 rounded" />
                  <div className="h-16 bg-gray-200 rounded" />
                  <div className="h-10 bg-gray-200 rounded w-3/4" />
                </div>
              ) : selectedPOI ? (
                <POIDetails
                  poi={selectedPOI}
                  onClose={handlePOIClose}
                  parentName={selectedCity?.name ?? selectedGemeente?.name}
                />
              ) : (
                <ParkingRules
                  gemeente={selectedGemeente}
                  city={selectedCity}
                  onClose={handleDetailsClose}
                  pois={panelPOIs}
                  placeName={placeName}
                  onPOISelect={handlePOISelect}
                />
              )}

              {/* Share stays at one spot */}
              {!detailsLoading && (
                <div className="sticky bottom-0 -mx-4 mt-4 bg-white p-4 pt-3">
                  <button
                    type="button"
                    onClick={handleShare}
                    disabled={shareLoading}
                    data-share-state={shareResult ? 'done' : shareLoading ? 'sharing' : 'idle'}
                    className={`flex w-full text-white font-semibold py-3 px-4 rounded-lg shadow-lg items-center justify-center gap-2 transition-[background-color,scale] duration-200 ease-out active:scale-[0.98] motion-reduce:active:scale-100 disabled:cursor-wait ${
                      shareResult ? 'bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="overflow-visible"
                      aria-hidden="true"
                    >
                      {shareResult ? (
                        <path className="share-check" pathLength={1} d="M5 13l4 4L19 7" />
                      ) : (
                        <>
                          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                          <g className="share-arrow" data-flying={shareLoading}>
                            <polyline points="16,6 12,2 8,6" />
                            <line x1="12" y1="2" x2="12" y2="15" />
                          </g>
                        </>
                      )}
                    </svg>
                    <span>{shareResult ?? 'Deel deze locatie'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

const App: React.FC<AppProps> = (props) => (
  <ToastProvider>
    <AppContent {...props} />
  </ToastProvider>
)
export default App

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { ToastProvider, useToast } from './components/Layout/Toast'
import 'leaflet/dist/leaflet.css'
import MapView from '@components/Map/MapView'
import { SpotlightSearch } from '@components/Search/SpotlightSearch'
import { ParkingRules } from '@components/Info/ParkingRules'
import { POIDetails } from '@components/Info/POIDetails'
import { Header } from '@components/Layout/Header'
import { PromoBar } from '@components/Layout/PromoBar'
import { useMapStore } from '@stores/mapStore'
import { useGemeenteData } from '@hooks/useGemeenteData'
import { useKeyboardShortcuts } from '@hooks/useKeyboardShortcuts'
import type { Gemeente } from './types/gemeente'
import { type City } from './types/city'
import type { POI } from './types/poi'
import { fetchFullCity } from './data/index'

import L from 'leaflet'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

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
}

const AppContent: React.FC<AppProps> = ({ initialGemeenteId, initialCityId }) => {
  const [selectedGemeente, setSelectedGemeente] = useState<Gemeente | null>(null)
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [swipeOffset, setSwipeOffset] = useState(0)

  const detailsRef = useRef<HTMLDivElement>(null)
  const panelTouchStartY = useRef<number | null>(null)
  const swipeOffsetRef = useRef(0)
  const selectedGemeenteRef = useRef<Gemeente | null>(null)

  const { showToast } = useToast()
  const { setSelectedGemeente: setSelectedGemeenteId, focusOnGemeente, resetView } = useMapStore()
  const { gemeentes, loading, loadFullGemeente } = useGemeenteData()

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
      })
      .finally(() => setDetailsLoading(false))
  }, [initialGemeenteId, gemeentes, setSelectedGemeenteId, focusOnGemeente, loadFullGemeente])

  useEffect(() => {
    if (!initialCityId) return
    setDetailsLoading(true)
    fetchFullCity(initialCityId)
      .then((city) => {
        setSelectedCity(city)
        if (city.coordinates) focusOnGemeente([city.coordinates.lat, city.coordinates.lng], 12)
      })
      .catch(console.error)
      .finally(() => setDetailsLoading(false))
  }, [initialCityId, focusOnGemeente])

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
      setSelectedGemeente(full ?? lite)
      setDetailsLoading(false)
    },
    [setSelectedGemeenteId, focusOnGemeente, loadFullGemeente]
  )

  const handleCitySelect = useCallback(
    async (city: City | null) => {
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
    (gemeente: Gemeente) => {
      handleGemeenteSelect(gemeente)
      setSearchOpen(false)
    },
    [handleGemeenteSelect]
  )

  const handlePOISelect = useCallback(
    (poi: POI) => {
      setSelectedPOI(poi)
      focusOnGemeente([poi.coordinates.lat, poi.coordinates.lng], 17)
    },
    [focusOnGemeente]
  )

  useEffect(() => {
    selectedGemeenteRef.current = selectedGemeente
  }, [selectedGemeente])

  const handlePOIClose = useCallback(() => {
    setSelectedPOI(null)
    const gemeente = selectedGemeenteRef.current
    if (gemeente?.coordinates) {
      const zoom = typeof gemeente.zoom === 'number' ? gemeente.zoom : 12
      focusOnGemeente([gemeente.coordinates.lat, gemeente.coordinates.lng], zoom)
    }
  }, [focusOnGemeente])

  const handleDetailsClose = useCallback(() => {
    setSelectedGemeente(null)
    setSelectedCity(null)
    setSelectedPOI(null)
    setSelectedGemeenteId(null)
    resetView()
    window.history.pushState({}, '', '/')
  }, [setSelectedGemeenteId, resetView])

  const handlePanelTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    const el = e.currentTarget as HTMLElement
    if (el.scrollTop === 0) {
      panelTouchStartY.current = e.touches[0].clientY
    }
  }, [])

  const handlePanelTouchMove = useCallback((e: React.TouchEvent) => {
    if (panelTouchStartY.current === null) return
    const delta = e.touches[0].clientY - panelTouchStartY.current
    if (delta > 0) {
      swipeOffsetRef.current = delta
      setSwipeOffset(delta)
    }
  }, [])

  const handlePanelTouchEnd = useCallback(() => {
    if (swipeOffsetRef.current > 80) {
      handleDetailsClose()
    }
    swipeOffsetRef.current = 0
    setSwipeOffset(0)
    panelTouchStartY.current = null
  }, [handleDetailsClose])

  const [shareLoading, setShareLoading] = useState(false)
  const handleShare = async () => {
    setShareLoading(true)
    try {
      const shareUrl = window.location.href
      let title = 'MijnMotorParkeren.nl'
      let text = 'Bekijk het parkeerbeleid voor jouw motor in Nederlandse gemeenten'
      if (selectedCity) {
        title = `Parkeerregels in ${selectedCity.name}`
        text = `Bekijk de parkeerregels voor ${selectedCity.name} (gemeente ${selectedCity.parent}) op MijnMotorParkeren.nl`
      } else if (selectedGemeente) {
        title = `Parkeerregels in ${selectedGemeente.name}`
        text = `Bekijk de parkeerregels voor ${selectedGemeente.name} op MijnMotorParkeren.nl`
      }
      const shareData = { title, text, url: shareUrl }
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(shareUrl)
        showToast('Link gekopieerd!')
      }
    } catch (error) {
      console.error('Error sharing:', error)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Gemeentes laden...</p>
        </div>
      </div>
    )
  }

  const detailsOpen = Boolean(selectedGemeente || selectedCity || detailsLoading)

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <PromoBar />
      <Header onSearchOpen={() => setSearchOpen(true)} />

      <main className="flex-1 relative overflow-hidden">
        <MapView
          gemeentes={gemeentes}
          onGemeenteSelect={handleGemeenteSelect}
          onCitySelect={handleCitySelect}
          onPOISelect={handlePOISelect}
          onReset={handleDetailsClose}
          selectedGemeente={selectedGemeente}
          selectedCity={selectedCity}
          detailsOpen={detailsOpen}
        />

        <SpotlightSearch
          open={searchOpen}
          onOpenChange={setSearchOpen}
          onSelect={handleSearchSelect}
        />

        {detailsOpen && (
          <div
            ref={detailsRef}
            className="fixed sm:absolute bottom-0 sm:top-4 left-0 sm:left-auto w-full sm:w-auto right-0 sm:right-4 bg-white rounded-t-2xl sm:rounded-lg shadow-2xl p-4 max-w-full sm:max-w-sm z-[1001] border-t sm:border-none max-h-[70vh] sm:max-h-none overflow-y-auto"
            style={{
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              transform: swipeOffset > 0 ? `translateY(${swipeOffset}px)` : undefined,
              transition: swipeOffset > 0 ? 'none' : 'transform 0.3s ease-out',
            }}
            onTouchStart={handlePanelTouchStart}
            onTouchMove={handlePanelTouchMove}
            onTouchEnd={handlePanelTouchEnd}
          >
            <div className="sm:hidden flex justify-center mb-2">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            {detailsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : selectedPOI ? (
              <POIDetails poi={selectedPOI} onClose={handlePOIClose} />
            ) : (
              <ParkingRules
                gemeente={selectedGemeente}
                city={selectedCity}
                onClose={handleDetailsClose}
              />
            )}

            {!detailsLoading && !selectedPOI && (
              <button
                type="button"
                onClick={handleShare}
                disabled={shareLoading}
                className="hidden sm:flex w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg shadow-lg items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {shareLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Delen...</span>
                  </>
                ) : (
                  <>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <polyline points="16,6 12,2 8,6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                    <span>Deel deze locatie</span>
                  </>
                )}
              </button>
            )}
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

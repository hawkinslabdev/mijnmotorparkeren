// src/App.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import MapView from '@components/Map/MapView'
import { SpotlightSearch } from '@components/Search/SpotlightSearch'
import { ParkingRules } from '@components/Info/ParkingRules'
import { Header } from '@components/Layout/Header'
import { useMapStore } from '@stores/mapStore'
import { useGemeenteData } from '@hooks/useGemeenteData'
import { useKeyboardShortcuts } from '@hooks/useKeyboardShortcuts'
import { useGeolocation } from '@hooks/useGeolocation'
import { Gemeente } from './types/gemeente'
import { City } from './types/city'
import './App.css'
import Seo from '@components/Seo'

// Import the page components
import { HomePage } from './pages/HomePage'
import { GemeentePage } from './pages/GemeentePage'
import { CityPage } from './pages/CityPage'

// Fix for default markers in react-leaflet
import L from 'leaflet'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
})

L.Marker.prototype.options.icon = DefaultIcon

// Helper to extract gemeenteId or cityId from the path
function getRouteParams(pathname: string) {
  const gemeenteMatch = pathname.match(/^\/gemeente\/([^/]+)/)
  const cityMatch = pathname.match(/^\/stad\/([^/]+)/)
  return {
    gemeenteId: gemeenteMatch ? gemeenteMatch[1] : null,
    cityId: cityMatch ? cityMatch[1] : null,
  }
}

// Main app content component (wrapped by router)
const AppContent: React.FC = () => {
  const [selectedGemeente, setSelectedGemeente] = useState<Gemeente | null>(null)
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // Ref for the details panel
  const detailsRef = useRef<HTMLDivElement>(null)
  
  const { 
    setSelectedGemeente: setSelectedGemeenteId,
    focusOnGemeente 
  } = useMapStore()
  
  const { gemeentes, loading } = useGemeenteData()
  useGeolocation()

  // Load gemeente/city data at the top level for SEO
  useEffect(() => {
    const { gemeenteId } = getRouteParams(location.pathname)
    if (gemeenteId && gemeentes.length > 0) {
      const gemeente = gemeentes.find(g => g.id === gemeenteId)
      if (gemeente) setSelectedGemeente(gemeente)
    }
  }, [location.pathname, gemeentes])

  useEffect(() => {
    const { cityId } = getRouteParams(location.pathname)
    if (cityId) {
      const loadCity = async () => {
        try {
          const response = await fetch(`/data/city/${cityId}.json`)
          if (response.ok) {
            const city = await response.json()
            setSelectedCity(city)
          }
        } catch (e) {
          console.error('Error loading city data:', e)
          setSelectedCity(null)
          navigate('/', { replace: true })
        }
      }
      loadCity()
    }
  }, [location.pathname, navigate])

  // Handle keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'k',
      ctrlKey: true,
      callback: () => setSearchOpen(true)
    },
    {
      key: 'k',
      metaKey: true,
      callback: () => setSearchOpen(true)
    },
    {
      key: '/',
      callback: () => setSearchOpen(true)
    },
    {
      key: 'Escape',
      callback: () => {
        setSearchOpen(false)
        handleDetailsClose()
      }
    }
  ])

  // Handle gemeente selection
  const handleGemeenteSelect = (gemeente: Gemeente | null) => {
    setSelectedGemeente(gemeente)
    setSelectedCity(null)
    setSelectedGemeenteId(gemeente?.id || null)
    
    if (gemeente && gemeente.id) {
      // Update URL when gemeente is selected
      navigate(`/gemeente/${gemeente.id}`)
    }
  }

  // Handle city selection
  const handleCitySelect = (city: City | null) => {
    setSelectedCity(city)
    setSelectedGemeente(null)
    setSelectedGemeenteId(null)
    
    if (city && city.id) {
      // Update URL when city is selected
      navigate(`/stad/${city.id}`)
    }
  }

  // Handle search result selection
  const handleSearchSelect = (gemeente: Gemeente) => {
    handleGemeenteSelect(gemeente)
    if (gemeente.coordinates) {
      focusOnGemeente([gemeente.coordinates.lat, gemeente.coordinates.lng], 12)
    }
    setSearchOpen(false)
  }

  // Handle close of details panel
  const handleDetailsClose = useCallback(() => {
    setSelectedGemeente(null)
    setSelectedCity(null)
    setSelectedGemeenteId(null)
    // Navigate back to home when closing details
    navigate('/')
  }, [navigate, setSelectedGemeenteId])

  // Handle share functionality with proper URLs
  const [shareLoading, setShareLoading] = useState(false)
  const handleShare = async () => {
    setShareLoading(true)
    try {
      // Use the current location pathname for sharing
      const shareUrl = window.location.origin + location.pathname
      
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
        alert('Link gekopieerd naar klembord!')
      }
    } catch (error) {
      console.error('Error sharing:', error)
    } finally {
      setShareLoading(false)
    }
  }

  // Handle click outside details to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const shareBtn = document.getElementById('mobile-share-btn')
      if (shareBtn && shareBtn.contains(event.target as Node)) {
        return
      }
      
      if (detailsRef.current && !detailsRef.current.contains(event.target as Node)) {
        const mapContainer = document.querySelector('.leaflet-container')
        if (mapContainer && mapContainer.contains(event.target as Node)) {
          handleDetailsClose()
        }
      }
    }

    if (selectedGemeente || selectedCity) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [selectedGemeente, selectedCity, handleDetailsClose])

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

  // Generate canonical URL based on current route
  const getCanonicalUrl = () => {
    const baseUrl = 'https://mijnmotorparkeren.nl'
    return baseUrl + location.pathname
  }

  return (
    <>
      {/* SEO for gemeente */}
      {selectedGemeente && (
        <Seo
          title={`Motor parkeren in ${selectedGemeente.name} | Parkeerregels`}
          description={`Alles over motor parkeren in ${selectedGemeente.name}. Bekijk de parkeerregels voor motoren op MijnMotorParkeren.nl.`}
          canonical={getCanonicalUrl()}
          image={`${window.location.origin}/android-chrome-512x512.png`}
        />
      )}
      {/* SEO for city */}
      {selectedCity && (
        <Seo
          title={`Motor parkeren in ${selectedCity.name} | Parkeerregels`}
          description={`Alles over motor parkeren in ${selectedCity.name} (gemeente ${selectedCity.parent}). Bekijk de parkeerregels voor motoren op MijnMotorParkeren.nl.`}
          canonical={getCanonicalUrl()}
          image={`${window.location.origin}/android-chrome-512x512.png`}
        />
      )}
      {/* Fallback SEO for homepage or when no data */}
      {!selectedGemeente && !selectedCity && (
        <Seo
          title="Motor parkeren Nederland | MijnMotorParkeren.nl"
          description="Bekijk het parkeerbeleid voor motor parkeren in Nederlandse gemeenten. Vind alle regels op MijnMotorParkeren.nl."
          canonical={getCanonicalUrl()}
          image={`${window.location.origin}/android-chrome-512x512.png`}
        />
      )}
      
      <div className="viewport-full bg-gray-50 flex flex-col">
        <Header onSearchOpen={() => setSearchOpen(true)} />
        
        <main className="flex-1 relative">
          <MapView 
            gemeentes={gemeentes} 
            onGemeenteSelect={handleGemeenteSelect}
            onCitySelect={handleCitySelect}
            selectedGemeente={selectedGemeente}
            selectedCity={selectedCity}
            detailsOpen={Boolean(selectedGemeente || selectedCity)}
          />
          
          <SpotlightSearch
            open={searchOpen}
            onOpenChange={setSearchOpen}
            onSelect={handleSearchSelect}
          />
          
          {(selectedGemeente || selectedCity) && (
            <div 
              ref={detailsRef}
              className="fixed sm:absolute bottom-0 sm:top-4 left-0 sm:left-auto w-full sm:w-auto right-0 sm:right-4 bg-white rounded-t-2xl sm:rounded-lg shadow-2xl p-4 max-w-full sm:max-w-sm z-[1001] border-t sm:border-none transition-all duration-300 max-h-[70vh] sm:max-h-none overflow-y-auto"
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
            >
              <div className="sm:hidden flex justify-center mb-2">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
              </div>

              <ParkingRules 
                gemeente={selectedGemeente} 
                city={selectedCity}
                onClose={handleDetailsClose}
              />

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
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                      <polyline points="16,6 12,2 8,6"/>
                      <line x1="12" y1="2" x2="12" y2="15"/>
                    </svg>
                    <span>Deel deze locatie</span>
                  </>
                )}
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Route handlers - these components handle the URL params and update state */}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route 
          path="/gemeente/:gemeenteId" 
          element={
            <GemeentePage 
              gemeentes={gemeentes} 
              onGemeenteSelect={handleGemeenteSelect}
            />
          } 
        />
        <Route 
          path="/stad/:cityId" 
          element={
            <CityPage 
              onCitySelect={handleCitySelect}
            />
          } 
        />
      </Routes>
    </>
  )
}

// Root App component with Router
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
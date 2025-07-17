// src/App.tsx
import React, { useEffect, useState, useRef } from 'react'
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
import { calculateOptimalZoom } from './utils/mapUtils'
import Seo from '@components/Seo'

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

const App: React.FC = () => {
  const [selectedGemeente, setSelectedGemeente] = useState<Gemeente | null>(null)
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  
  // Ref for the details panel (works for both gemeente and city)
  const detailsRef = useRef<HTMLDivElement>(null)
  
  const { 
    setSelectedGemeente: setSelectedGemeenteId,
    focusOnGemeente 
  } = useMapStore()
  
  const { gemeentes, loading } = useGemeenteData()
  useGeolocation()

  // Handle click outside details to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Prevent closing if clicking the share button
      const shareBtn = document.getElementById('mobile-share-btn');
      if (shareBtn && (shareBtn === event.target || shareBtn.contains(event.target as Node))) {
        return;
      }
      if (
        (selectedGemeente || selectedCity) &&
        detailsRef.current &&
        !detailsRef.current.contains(event.target as Node)
      ) {
        // Close the details panel
        setSelectedGemeente(null)
        setSelectedCity(null)
        setSelectedGemeenteId(null)
      }
    }

    // Add event listener when something is selected
    if (selectedGemeente || selectedCity) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    // Cleanup event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [selectedGemeente, selectedCity, setSelectedGemeenteId])

  // Set up keyboard shortcuts
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
      key: 'Escape',
      callback: () => {
        setSearchOpen(false)
        setSelectedGemeente(null)
        setSelectedCity(null)
        setSelectedGemeenteId(null)
      }
    }
  ])

  // Handle gemeente selection
  const handleGemeenteSelect = (gemeente: Gemeente | null) => {
    console.log('handleGemeenteSelect called with:', gemeente)
    setSelectedGemeente(gemeente)
    setSelectedCity(null) // Clear city when gemeente is selected
    setSelectedGemeenteId(gemeente?.id || null)
    if (gemeente && gemeente.coordinates) {
      focusOnGemeente([gemeente.coordinates.lat, gemeente.coordinates.lng], 12)
      setSearchOpen(false)
    }
  }

  // Handle city selection
  const handleCitySelect = (city: City) => {
    console.log('handleCitySelect called with:', city)
    setSelectedCity(city)
    setSelectedGemeente(null) // Clear gemeente when city is selected
    setSelectedGemeenteId(null)
    if (city && city.coordinates) {
      // Calculate optimal zoom based on city boundary size
      const optimalZoom = calculateOptimalZoom(city.area)
      console.log(`🔍 City ${city.name}; calculated zoom: ${optimalZoom}`)
      focusOnGemeente([city.coordinates.lat, city.coordinates.lng], optimalZoom)
      setSearchOpen(false)
    }
  }

  // Handle search result selection
  const handleSearchSelect = (gemeente: Gemeente) => {
    handleGemeenteSelect(gemeente)
  }

  // Handle close of details panel
  const handleDetailsClose = () => {
    setSelectedGemeente(null)
    setSelectedCity(null)
    setSelectedGemeenteId(null)
  }

  // Open modal if URL matches /gemeente/:id or /stad/:id
  useEffect(() => {
    const path = window.location.pathname;
    const gemeenteMatch = path.match(/^\/gemeente\/([a-z0-9-]+)/i);
    const stadMatch = path.match(/^\/stad\/([a-z0-9-]+)/i);
    if (gemeenteMatch && gemeentes.length > 0) {
      const gemeenteId = gemeenteMatch[1];
      const found = gemeentes.find(g => g.id === gemeenteId);
      if (found) {
        setSelectedGemeente(found);
        setSelectedCity(null);
        setSelectedGemeenteId(found.id);
        if (found.coordinates) {
          focusOnGemeente([found.coordinates.lat, found.coordinates.lng], 12);
        }
      }
    } else if (stadMatch && gemeentes.length > 0) {
      const cityId = stadMatch[1];
      fetch(`/data/city/${cityId}.json`).then(async r => {
        if (r.ok) {
          const city = await r.json();
          setSelectedCity(city);
          setSelectedGemeente(null);
          setSelectedGemeenteId(null);
          if (city.coordinates) {
            // Calculate optimal zoom based on city boundary size if available
            let zoom = 13;
            if (city.area) {
              try {
                const { calculateOptimalZoom } = await import('./utils/mapUtils');
                zoom = calculateOptimalZoom(city.area);
              } catch(error) {
                console.error('Error calculating optimal zoom:', error);
              }
            }
            focusOnGemeente([city.coordinates.lat, city.coordinates.lng], zoom);
          }
        }
      });
    }
  }, [gemeentes, focusOnGemeente, setSelectedGemeenteId]);

  // Share logic for both mobile and desktop
  const [shareLoading, setShareLoading] = useState(false);
  const handleShare = async () => {
    setShareLoading(true);
    try {
      let shareUrl = window.location.origin;
      let title = 'MijnMotorParkeren.nl';
      let text = 'Bekijk het parkeerbeleid voor jouw motor in Nederlandse gemeenten';
      // Determine the share URL and text based on selected gemeente or city
      if (selectedCity) {
        shareUrl += `/stad/${encodeURIComponent(selectedCity.id)}`;
        title = `Parkeerregels in ${selectedCity.name}`;
        text = `Bekijk de parkeerregels voor ${selectedCity.name} (gemeente ${selectedCity.parent}) op MijnMotorParkeren.nl`;
      } else if (selectedGemeente) {
        shareUrl += `/gemeente/${encodeURIComponent(selectedGemeente.id)}`;
        title = `Parkeerregels in ${selectedGemeente.name}`;
        text = `Bekijk de parkeerregels voor ${selectedGemeente.name} op MijnMotorParkeren.nl`;
      } else {
        shareUrl = window.location.href;
      }
      const shareData = {
        title,
        text,
        url: shareUrl,
      };
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert('Link gekopieerd naar klembord!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    } finally {
      setShareLoading(false);
    }
  };

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

  return (
    <>
      <Seo
        title={selectedCity ? `Motor parkeren in ${selectedCity.name} | Parkeerregels` : selectedGemeente ? `Motor parkeren in ${selectedGemeente.name} | Parkeerregels` : 'Motor parkeren Nederland | MijnMotorParkeren.nl'}
        description={selectedCity ? `Alles over motor parkeren in ${selectedCity.name} (gemeente ${selectedCity.parent}). Bekijk de parkeerregels voor motoren op MijnMotorParkeren.nl.` : selectedGemeente ? `Alles over motor parkeren in ${selectedGemeente.name}. Bekijk de parkeerregels voor motoren op MijnMotorParkeren.nl.` : 'Bekijk het parkeerbeleid voor motor parkeren in Nederlandse gemeenten. Vind alle regels op MijnMotorParkeren.nl.'}
        canonical={typeof window !== 'undefined' ? window.location.href : undefined}
        image={typeof window !== 'undefined' ? `${window.location.origin}/android-chrome-512x512.png` : undefined}
      />
      {/* SEO Structured Data for motor parkeren */}
      {(selectedGemeente || selectedCity) && (
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: selectedCity ? `Motor parkeren in ${selectedCity.name}` : `Motor parkeren in ${selectedGemeente?.name}`,
            description: selectedCity
              ? `Alles over motor parkeren in ${selectedCity.name} (gemeente ${selectedCity.parent}). Bekijk de parkeerregels voor motoren op MijnMotorParkeren.nl.`
              : `Alles over motor parkeren in ${selectedGemeente?.name}. Bekijk de parkeerregels voor motoren op MijnMotorParkeren.nl.`,
            url: typeof window !== 'undefined' ? window.location.href : undefined,
            inLanguage: 'nl-NL',
            isPartOf: 'https://mijnmotorparkeren.nl',
            about: 'motor parkeren',
            keywords: selectedCity
              ? `motor parkeren, ${selectedCity.name}, parkeerregels, motor, stoep, gemeente ${selectedCity.parent}`
              : `motor parkeren, ${selectedGemeente?.name}, parkeerregels, motor, stoep, gemeente`,
          })}
        </script>
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
          
          {/* Search Interface */}
          <SpotlightSearch
            open={searchOpen}
            onOpenChange={setSearchOpen}
            onSelect={handleSearchSelect}
          />
          
          {/* Selected info panel; handles both gemeente and city */}
          {(selectedGemeente || selectedCity) && (
            <div 
              ref={detailsRef}
              className="fixed sm:absolute bottom-0 sm:top-4 left-0 sm:left-auto w-full sm:w-auto right-0 sm:right-4 bg-white rounded-t-2xl sm:rounded-lg shadow-2xl p-4 max-w-full sm:max-w-sm z-[1001] border-t sm:border-none transition-all duration-300 max-h-[70vh] sm:max-h-none overflow-y-auto"
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
            >
              {/* Drag handle for mobile */}
              <div className="sm:hidden flex justify-center mb-2">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
              </div>

              {/* Unified ParkingRules component */}
              <ParkingRules 
                gemeente={selectedGemeente} 
                city={selectedCity}
                onClose={handleDetailsClose}
              />

              {/* Desktop wide share button */}
              <button
                type="button"
                onClick={handleShare}
                disabled={shareLoading}
                className="hidden sm:flex w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg shadow-lg items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {shareLoading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                    <polyline points="16,6 12,2 8,6"/>
                    <line x1="12" y1="2" x2="12" y2="15"/>
                  </svg>
                )}
                <span>Deel deze locatie</span>
              </button>
              <div className="text-xs text-gray-400 text-center px-6 pb-4 pt-6 select-none" aria-label="Disclaimer">
                De informatie op deze site is met zorg samengesteld, maar de lokale beleidsregels kunnen afwijken. Controleer dit altijd bij de gemeente. MijnMotorParkeren.nl is niet aansprakelijk voor gevolgen van het gebruik.
              </div>
            </div>
          )}
          
          {/* Status indicator */}
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow p-2 z-1000 hidden">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">
                {gemeentes.length} gemeentes loaded
              </span>
            </div>
          </div>
          
          {/* Search shortcut hint */}
          <div className="absolute bottom-4 right-4 bg-black/75 text-white px-3 py-2 rounded-lg text-sm z-1000 hidden sm:block">
            Druk <kbd className="bg-white/20 px-1 rounded">Ctrl+K</kbd> om te zoeken
          </div>
        </main>
      </div>
    </>
  )
}

export default App
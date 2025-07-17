// src/components/Map/MapView.tsx
import React, { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap, CircleMarker } from 'react-leaflet'
import { LatLngExpression, Map as LeafletMap } from 'leaflet'
import { useMapStore } from '@stores/mapStore'
import { Gemeente } from '@/types/gemeente'
import { City } from '@/types/city'
import { useGeolocation } from '@/hooks/useGeolocation'
import { getMapBoundaryColors } from '@/utils/gemeenteUtils'
import 'leaflet/dist/leaflet.css'
import type * as GeoJSONType from 'geojson'
import type { TileEvent, TileErrorEvent } from 'leaflet'
import { RotateCcw } from 'lucide-react'

interface MapViewProps {
  gemeentes: Gemeente[]
  onGemeenteSelect: (gemeente: Gemeente | null) => void
  onCitySelect?: (city: City) => void
  debugEnabled?: boolean
  selectedGemeente?: Gemeente | null
  selectedCity?: City | null
  detailsOpen?: boolean // Add this prop
}

// Component to handle map updates
const MapUpdater: React.FC<{ center: LatLngExpression; zoom: number }> = ({ center, zoom }) => {
  const map = useMap()
  
  useEffect(() => {
    map.setView(center, zoom)
  }, [map, center, zoom])
  
  return null
}

// Component to display the parking legend
const ParkingLegend: React.FC = () => {
  return (
    <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 z-[1000] max-w-xs">
      <h4 className="font-semibold text-sm mb-3 text-gray-800">Legenda</h4>
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2 border-gray-400 bg-gray-100"></div>
          <span>Informatie beschikbaar</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2 border-blue-600 bg-blue-100"></div>
          <span>Parkeren op stoep toegestaan</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2 border-green-600 bg-green-100"></div>
          <span>Gratis in het vak parkeren</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2 border-red-600 bg-red-100"></div>
          <span>Alleen (betaald) in het vak</span>
        </div>
      </div>
      <div className="mt-3 pt-2 border-t border-gray-200 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          <span>Klik op gemeente voor details</span>
        </div>
      </div>
    </div>
  )
}

// Mobile Share Button Component; only visible on mobile
const MobileShareButton: React.FC<{
  onShareClick: () => void
  isLoading?: boolean
  id?: string
}> = ({ onShareClick, isLoading = false, id }) => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check if device is mobile
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      const hasSmallScreen = window.innerWidth < 768
      setIsMobile(isMobileDevice || hasSmallScreen)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (!isMobile) return null

  return (
    <button
      id={id}
      onClick={onShareClick}
      disabled={isLoading}
      className="absolute top-3 right-3 bg-white rounded-lg shadow-lg p-3 z-[1000] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      title="Deel locatie"
    >
      {isLoading ? (
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-700">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
          <polyline points="16,6 12,2 8,6"/>
          <line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
      )}
    </button>
  )
}

// Current Location Button Component; moved down when share button is present

// --- Add a custom pane for city boundaries ---
const CityPaneSetter: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    if (!map.getPane('city-boundaries')) {
      map.createPane('city-boundaries');
      map.getPane('city-boundaries')!.style.zIndex = '450'; // higher than overlayPane (default 400)
    }
  }, [map]);
  return null;
}

// City Boundaries Layer Component; Fixed to use proper colors
const CityBoundariesLayer: React.FC<{
  gemeentes: Gemeente[]
  onCitySelect: (city: City) => void
  debugEnabled?: boolean
}> = ({ gemeentes, onCitySelect, debugEnabled = false }) => {
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadAllCities = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Load city index
        const indexResponse = await fetch('/data/city/index.json')
        if (!indexResponse.ok) {
          if (debugEnabled) {
            console.log('ℹ️ No city index found; cities not available')
          }
          setCities([])
          return
        }

        const index = await indexResponse.json()
        const loadedCities: City[] = []

        if (debugEnabled) {
          console.log(`🏙️ Loading ${index.cities.length} cities...`)
        }

        // Load each city file
        for (const cityRef of index.cities) {
          try {
            const cityResponse = await fetch(`/data/${cityRef.reference}`)
            if (cityResponse.ok) {
              const cityData = await cityResponse.json()
              loadedCities.push(cityData)
              
              if (debugEnabled) {
                console.log(`Loaded city: ${cityData.name}`)
              }
            }
          } catch (error) {
            if (debugEnabled) {
              console.warn(`❌ Failed to load city ${cityRef.id}:`, error)
            }
          }
        }

        setCities(loadedCities)
        
        if (debugEnabled) {
          console.log(`🏙️ Successfully loaded ${loadedCities.length} cities`)
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load cities')
        if (debugEnabled) {
          console.error('❌ Failed to load city data:', error)
        }
      } finally {
        setLoading(false)
      }
    }

    loadAllCities()
  }, [debugEnabled])

  // Filter cities to only show those for currently visible gemeentes
  const visibleCities = cities.filter(city => 
    gemeentes.some(gemeente => gemeente.id === city.parent)
  )

  if (loading) {
    return debugEnabled ? (
      <div className="absolute top-16 right-4 bg-blue-600/75 text-white p-2 rounded text-xs z-[2000]">
        🏙️ Loading cities...
      </div>
    ) : null
  }

  if (error) {
    return debugEnabled ? (
      <div className="absolute top-16 right-4 bg-red-600/75 text-white p-2 rounded text-xs z-[2000]">
        ❌ City load error: {error}
      </div>
    ) : null
  }

  if (visibleCities.length === 0) {
    return debugEnabled ? (
      <div className="absolute top-16 right-4 bg-gray-600/75 text-white p-2 rounded text-xs z-[2000]">
        ℹ️ No cities with override rules
      </div>
    ) : null
  }

  return (
    <>
      {/* Ensure pane is created before rendering GeoJSONs */}
      <CityPaneSetter />
      {visibleCities.map((city) => (
        <GeoJSON
          key={`city-boundary-${city.id}`}
          data={city.area}
          pane="city-boundaries"
          style={(() => {
            const colors = getMapBoundaryColors(city)
            return {
              fillColor: colors.fillColor,
              color: colors.borderColor,
              weight: 3,
              opacity: 1,
              fillOpacity: 0.6,
              dashArray: '8, 4'
            }
          })()}
          eventHandlers={{
            click: (e) => {
              // CRITICAL: Stop event propagation to prevent gemeente click
              e.originalEvent.stopPropagation()
              
              if (debugEnabled) {
                console.log('🏙️ City clicked (preventing gemeente click):', city.name)
              }
              
              onCitySelect(city)
            },
            mouseover: (e) => {
              const layer = e.target
              layer.setStyle({
                weight: 4,
                fillOpacity: 0.8
              })
              
              // Also stop propagation on hover to prevent gemeente events
              e.originalEvent?.stopPropagation()
            },
            mouseout: (e) => {
              const layer = e.target
              layer.setStyle({
                weight: 3,
                fillOpacity: 0.6
              })
              
              e.originalEvent?.stopPropagation()
            }
          }}
        />
      ))}
      
      {debugEnabled && visibleCities.length > 0 && (
        <div className="absolute top-16 right-4 bg-orange-600/75 text-white p-2 rounded text-xs z-[2000] max-w-sm">
          <div>🏙️ Cities: {visibleCities.length}</div>
          <div className="mt-1 text-xs">
            {visibleCities.map(city => city.name).join(', ')}
          </div>
        </div>
      )}
    </>
  )
}

// Component to fetch and display real gemeente boundaries
const RealBoundariesLayer: React.FC<{
  gemeentes: Gemeente[]
  onGemeenteSelect: (gemeente: Gemeente) => void
  debugEnabled?: boolean
}> = ({ gemeentes, onGemeenteSelect, debugEnabled = false }) => {
  const [officialBoundaries, setOfficialBoundaries] = useState<GeoJSONType.FeatureCollection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRealBoundaries = async () => {
      try {
        if (debugEnabled) {
          console.log('🌍 Fetching official Dutch gemeente boundaries...')
        }
        
        // Simplified fetch without custom headers to avoid CORS preflight
        const response = await fetch('https://cartomap.github.io/nl/wgs84/gemeente_2025.geojson')
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        
        // Validate the response
        if (!data || !data.features || !Array.isArray(data.features)) {
          throw new Error('Invalid GeoJSON format')
        }
        
        if (debugEnabled) {
          console.log(`Loaded ${data.features.length} official gemeente boundaries`)
          console.log('Sample feature properties:', data.features[0]?.properties)
        }
        
        setOfficialBoundaries(data)
        setError(null)
      } catch (error) {
        if (debugEnabled) {
          console.error('❌ Failed to fetch official boundaries:', error)
        }
        setError(error instanceof Error ? error.message : 'Unknown error')
        setOfficialBoundaries(null)
      } finally {
        setLoading(false)
      }
    }

    fetchRealBoundaries()
  }, [debugEnabled])

  // Helper function to find matching boundary for a gemeente
  const findMatchingBoundary = (gemeente: Gemeente): GeoJSONType.Feature | null => {
    if (!officialBoundaries?.features) return null

    const foundFeature = officialBoundaries.features.find((feature) => {
      const props = feature.properties
      if (!props || !props.statnaam) return false
      
      // Clean up names for comparison
      const boundaryNameLower = props.statnaam.toLowerCase()
        .replace(/^gemeente\s+/i, '')
        .replace(/\s+\(.*\)$/, '') // Remove parenthetical suffixes like "(NH.)"
      
      const gemeenteNameLower = gemeente.name.toLowerCase()
        .replace(/^gemeente\s+/i, '')
        .replace(/\s+\(.*\)$/, '')
      
      const cleanBoundaryName = boundaryNameLower
        .replace(/^gemeente\s+/i, '')
        .replace(/\s+\(.*\)$/, '') // Remove parenthetical suffixes like "(NH.)"
      
      const cleanGemeenteName = gemeenteNameLower
        .replace(/^gemeente\s+/i, '')
        .replace(/\s+\(.*\)$/, '')
      
      if (cleanBoundaryName === cleanGemeenteName) {
        if (debugEnabled) {
          console.log(`Clean match found for ${gemeente.name}: ${cleanBoundaryName}`)
        }
        return true
      }
      
      // Try matching by CBS statcode if available
      if (props.statcode && gemeente.statcode && props.statcode === gemeente.statcode) {
        if (debugEnabled) {
          console.log(`Statcode match found for ${gemeente.name}: ${props.statcode}`)
        }
        return true
      }
      
      return false
    })

    // Return null if no feature found, otherwise return the found feature
    return foundFeature || null
  }

  if (loading) {
    return debugEnabled ? (
      <div className="absolute top-72 left-4 bg-blue-600/75 text-white p-2 rounded text-xs z-[2000]">
        🔄 Loading gemeente boundaries...
      </div>
    ) : null
  }

  if (error) {
    return debugEnabled ? (
      <div className="absolute top-72 left-4 bg-red-600/75 text-white p-2 rounded text-xs z-[2000] max-w-xs">
        ❌ Error loading boundaries: {error}
        <div className="mt-1 text-xs">Using fallback data...</div>
      </div>
    ) : null
  }

  if (!officialBoundaries) {
    if (debugEnabled) {
      console.log('📦 No official boundaries available, using fallback')
    }
    
    // Fallback to local boundaries if available
    return (
      <>
        {gemeentes.map((gemeente) => {
          if (!gemeente.boundaries) {
            if (debugEnabled) {
              console.log(`⚠️ No boundaries available for ${gemeente.name}`)
            }
            return null
          }
          
          if (debugEnabled) {
            console.log(`📦 Using local boundary for ${gemeente.name}`)
          }
          
          // FIXED: Use proper color logic
          const colors = getMapBoundaryColors(gemeente)
          
          return (
            <GeoJSON
              key={`fallback-boundary-${gemeente.id}`}
              data={{
                type: 'Feature',
                properties: { name: gemeente.name, id: gemeente.id },
                geometry: gemeente.boundaries
              } as GeoJSONType.Feature}
              style={{
                fillColor: colors.fillColor,
                color: colors.borderColor,
                weight: 2,
                opacity: 0.8,
                fillOpacity: 0.4
              }}
              eventHandlers={{
                click: () => onGemeenteSelect(gemeente)
              }}
            />
          )
        })}
        {debugEnabled && (
          <div className="absolute top-72 left-4 bg-yellow-600/75 text-white p-2 rounded text-xs z-[2000]">
            📦 Using local boundary data
          </div>
        )}
      </>
    )
  }

  // Use official boundaries
  let renderedCount = 0
  const notFoundGemeentes: string[] = []
  
  const renderedBoundaries = gemeentes.map((gemeente) => {
    const matchingFeature = findMatchingBoundary(gemeente)

    if (!matchingFeature) {
      if (debugEnabled) {
        console.log(`❌ No official boundary found for ${gemeente.name}`)
      }
      notFoundGemeentes.push(gemeente.name)
      
      // Try to use local boundary as fallback
      if (gemeente.boundaries) {
        if (debugEnabled) {
          console.log(`📦 Using local boundary fallback for ${gemeente.name}`)
        }
        
        // FIXED: Use proper color logic
        const colors = getMapBoundaryColors(gemeente)
        
        return (
          <GeoJSON
            key={`local-fallback-${gemeente.id}`}
            data={{
              type: 'Feature',
              properties: { name: gemeente.name, id: gemeente.id },
              geometry: gemeente.boundaries
            } as GeoJSONType.Feature}
            style={{
              fillColor: colors.fillColor,
              color: colors.borderColor,
              weight: 2,
              opacity: 0.8,
              fillOpacity: 0.3,
              dashArray: '5, 5' // Dashed line to indicate fallback
            }}
            eventHandlers={{
              click: () => onGemeenteSelect(gemeente)
            }}
          />
        )
      }
      
      return null
    }

    if (debugEnabled) {
      console.log(`Using official boundary for ${gemeente.name}`)
    }
    renderedCount++
    
    // FIXED: Use proper color logic
    const colors = getMapBoundaryColors(gemeente)
    
    return (
      <GeoJSON
        key={`official-boundary-${gemeente.id}`}
        data={matchingFeature}
        style={{
          fillColor: colors.fillColor,
          color: colors.borderColor,
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.5
        }}
        eventHandlers={{
          click: () => {
            if (debugEnabled) {
              console.log('Clicked gemeente:', gemeente.name)
            }
            onGemeenteSelect(gemeente)
          }
        }}
      />
    )
  })
  
  return (
    <>
      {renderedBoundaries}
      
      {/* Enhanced debug info for rendered boundaries */}
      {debugEnabled && (
        <div className="absolute top-72 left-4 bg-green-600/75 text-white p-2 rounded text-xs z-[2000] max-w-sm">
          <div>Official: {renderedCount}/{gemeentes.length}</div>
          <div>📦 Fallback: {gemeentes.length - renderedCount - notFoundGemeentes.length}</div>
          {notFoundGemeentes.length > 0 && (
            <div className="mt-1 text-xs">
              Missing: {notFoundGemeentes.join(', ')}
            </div>
          )}
        </div>
      )}
    </>
  )
}

const MapView: React.FC<MapViewProps> = ({ gemeentes, onGemeenteSelect, onCitySelect, debugEnabled = false, selectedGemeente, selectedCity, detailsOpen }) => {
  const { center, zoom, setCenter, setZoom } = useMapStore()
  const { getCurrentLocation } = useGeolocation()
  const mapRef = useRef<LeafletMap>(null)
  const [mapReady, setMapReady] = useState(false)
  const [tilesLoaded, setTilesLoaded] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<LatLngExpression | null>(null)
  const resetView = useMapStore((state) => state.resetView)

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      const hasSmallScreen = window.innerWidth < 768
      setIsMobile(isMobileDevice || hasSmallScreen)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // --- Ensure city-boundaries pane exists before children render ---
  useEffect(() => {
    if (mapRef.current && !mapRef.current.getPane('city-boundaries')) {
      mapRef.current.createPane('city-boundaries');
      mapRef.current.getPane('city-boundaries')!.style.zIndex = '450';
    }
  }, [mapReady]);

  // Handle gemeente selection
  const handleGemeenteSelect = (gemeente: Gemeente | null) => {
    onGemeenteSelect(gemeente)
  }

  // Handle city selection
  const handleCitySelect = (city: City) => {
    if (onCitySelect) {
      onCitySelect(city)
    }
    if (debugEnabled) {
      console.log('🏙️ City selected:', city.name, 'in', city.parent)
    }
  }

  // Handle current location button click
  const handleCurrentLocation = async () => {
    setLocationLoading(true)
    try {
      const location = await getCurrentLocation()
      if (location && mapRef.current) {
        setCenter(location)
        setZoom(13)
        mapRef.current.setView(location, 13)
        setCurrentLocation(location)
        if (debugEnabled) {
          console.log('📍 Centered map on user location:', location)
        }
      }
    } catch (error) {
      if (debugEnabled) {
        console.error('Failed to get current location:', error)
      }
      // Could add a toast notification here for user feedback
    } finally {
      setLocationLoading(false)
    }
  }

  // Handle share button click
  const handleShare = async () => {
    setShareLoading(true)
    try {
      let shareUrl = window.location.origin
      let title = 'MijnMotorParkeren.nl'
      let text = 'Bekijk het parkeerbeleid voor jouw motor in Nederlandse gemeenten'
      if (selectedCity) {
        shareUrl += `/stad/${encodeURIComponent(selectedCity.id)}`
        title = `Parkeerregels in ${selectedCity.name}`
        text = `Bekijk de parkeerregels voor ${selectedCity.name} (gemeente ${selectedCity.parent}) op MijnMotorParkeren.nl`
      } else if (selectedGemeente) {
        shareUrl += `/gemeente/${encodeURIComponent(selectedGemeente.id)}`
        title = `Parkeerregels in ${selectedGemeente.name}`
        text = `Bekijk de parkeerregels voor ${selectedGemeente.name} op MijnMotorParkeren.nl`
      } else {
        shareUrl = window.location.href
      }
      const shareData = {
        title,
        text,
        url: shareUrl,
      }
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData)
        if (debugEnabled) {
          console.log('📤 Successfully shared via Web Share API')
        }
      } else {
        await navigator.clipboard.writeText(shareUrl)
        if (debugEnabled) {
          console.log('📋 URL copied to clipboard as fallback')
        }
        alert('Link gekopieerd naar klembord!')
      }
    } catch (error) {
      if (debugEnabled) {
        console.error('Failed to share:', error)
      }
    } finally {
      setShareLoading(false)
    }
  }

  // Debug: Log when map is ready
  useEffect(() => {
    if (mapRef.current) {
      if (debugEnabled) {
        console.log('Map instance created:', mapRef.current)
        const container = mapRef.current.getContainer()
        console.log('Map container:', container)
        console.log('Map container size:', {
          width: container.offsetWidth,
          height: container.offsetHeight,
          computed: window.getComputedStyle(container)
        })
        console.log('Map container classes:', container.className)
      }
      
      setMapReady(true)
      
      // Force invalidate size after a short delay to ensure proper rendering
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize()
        }
      }, 100)
    }
  }, [debugEnabled])

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={center}
        zoom={zoom}
        ref={mapRef}
        className="w-full h-full z-0"
        zoomControl={false}
        attributionControl={true}
        whenReady={() => setMapReady(true)}
      >
        <MapUpdater center={center} zoom={zoom} />
        
        <TileLayer
          url={import.meta.env.VITE_MAP_TILE_URL || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
          attribution={import.meta.env.VITE_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
          eventHandlers={debugEnabled ? {
            loading: () => {
              console.log('🔄 Tiles loading...')
              setTilesLoaded(false)
            },
            load: () => {
              console.log('Tiles loaded successfully')
              setTilesLoaded(true)
            },
            tileerror: (e: TileErrorEvent) => {
              console.error('❌ Tile loading error:', e)
              console.error('Error details:', {
                coords: e.coords,
                error: e.error,
                tile: e.tile,
                url: e.target && 'src' in e.target ? (e.target as HTMLImageElement).src : undefined
              })
            },
            tileloadstart: (e: TileEvent) => {
              console.log('🟡 Tile load start:', e.tile && 'src' in e.tile ? (e.tile as HTMLImageElement).src : 'No URL')
            },
            tileload: (e: TileEvent) => {
              console.log('Single tile loaded:', e.tile && 'src' in e.tile ? (e.tile as HTMLImageElement).src : 'No URL')
            },
          } : {
            load: () => setTilesLoaded(true),
            loading: () => setTilesLoaded(false)
          }}
        />

        {/* LAYER ORDER IS CRITICAL: Gemeente boundaries first (bottom layer) */}
        {gemeentes.length > 0 && mapReady && (
          <RealBoundariesLayer 
            gemeentes={gemeentes} 
            onGemeenteSelect={handleGemeenteSelect}
            debugEnabled={debugEnabled}
          />
        )}

        {/* City boundaries second (top layer); will capture clicks first */}
        {gemeentes.length > 0 && mapReady && onCitySelect && (
          <CityBoundariesLayer
            gemeentes={gemeentes}
            onCitySelect={handleCitySelect}
            debugEnabled={debugEnabled}
          />
        )}

        {/* Current location indicator (map only) */}
        {currentLocation && (
          <CircleMarker
            center={currentLocation}
            radius={7}
            pathOptions={{ 
              color: '#fff', // white border
              fillColor: '#2563eb', // blue fill
              fillOpacity: 1,
              weight: 3, // thicker white border
            }}
            // Add a class for shadow/glow
            className="leaflet-user-location-indicator"
          />
        )}
      </MapContainer>
      {/* Floating action buttons (share, reset, location) on mobile; stacked vertically */}
      {isMobile && (
        <div className="absolute top-3 right-3 flex flex-col gap-3 z-[1000] md:hidden">
          {/* Mobile Share Button; always visible on mobile, positioned at top */}
          <MobileShareButton 
            id="mobile-share-btn"
            onShareClick={handleShare}
            isLoading={shareLoading}
          />

          {/* Mobile Reset Button; only visible on mobile, positioned below share button */}
          <button
            onClick={resetView}
            className="absolute right-3 bg-white rounded-lg shadow-lg p-3 z-[1000] hover:bg-gray-50 flex items-center justify-center md:hidden text-gray-700 focus:ring-2 focus:ring-blue-500"
            title="Reset kaart"
            style={{ minWidth: 48, minHeight: 48, top: 68 }}
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          {/* Current Location Button; only on mobile, below reset */}
          <button
            onClick={handleCurrentLocation}
            disabled={locationLoading}
            className="absolute right-3 bg-white rounded-lg shadow-lg p-3 z-[1000] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors md:hidden flex items-center justify-center text-gray-700 focus:ring-2 focus:ring-blue-500"
            title="Ga naar huidige locatie"
            style={{ minWidth: 48, minHeight: 48, top: 123 }}
          >
            {locationLoading ? (
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin border-blue-600"></div>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" className="text-gray-700">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="" fillOpacity="0.5"/>
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5" fill="#6b7280"/>
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Desktop-only Reset and Location buttons, stacked top-right */}
      {!isMobile && !detailsOpen && (
        <>
          <button
            onClick={resetView}
            className="absolute top-3 right-3 bg-white rounded-lg shadow-lg p-3 z-[1000] hover:bg-gray-50 transition-colors flex items-center justify-center"
            title="Reset kaart"
            style={{ minWidth: 48, minHeight: 48 }}
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={handleCurrentLocation}
            disabled={locationLoading}
            className="absolute right-3 bg-white rounded-lg shadow-lg p-3 z-[1000] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            title="Ga naar huidige locatie"
            style={{ minWidth: 48, minHeight: 48, top: 68 }}
          >
            {locationLoading ? (
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" className="text-gray-700">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="" fillOpacity="0.15"/>
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5" fill="#2563eb"/>
              </svg>
            )}
          </button>
        </>
      )}

      {/* Legend; always shown unless debugging is enabled */}
      {!debugEnabled && <ParkingLegend />}

      {/* Enhanced debug info at bottom; only when debugging */}
      {debugEnabled && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 z-[1000]">
          <h4 className="font-semibold text-sm mb-2">Map Debug Info</h4>
          <div className="text-xs space-y-1">
            <div>Map Ready: <span className={mapReady ? 'text-green-600' : 'text-red-600'}>{mapReady ? 'Yes' : 'No'}</span></div>
            <div>Tiles: <span className={tilesLoaded ? 'text-green-600' : 'text-orange-600'}>{tilesLoaded ? 'Loaded' : 'Loading'}</span></div>
            <div>Container: {mapRef.current ? 'Created' : 'Pending'}</div>
            <div>Boundaries: {gemeentes.filter(g => g.boundaries).length} loaded</div>
            <div>City Support: <span className={onCitySelect ? 'text-green-600' : 'text-red-600'}>{onCitySelect ? 'Enabled' : 'Disabled'}</span></div>
            {!mapReady && <div className="text-red-600">⚠️ Map not ready</div>}
            {!tilesLoaded && mapReady && <div className="text-orange-600">⚠️ Tiles loading</div>}
          </div>
        </div>
      )}
    </div>
  )
}

export default MapView
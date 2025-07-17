// src/components/Map/CityBoundariesLayer.tsx
import React, { useEffect } from 'react'
import { GeoJSON, useMap } from 'react-leaflet'
import { City } from '../../types/city'
import { Gemeente } from '../../types/gemeente'
import { getMapBoundaryColors } from '@/utils/gemeenteUtils'
import { cityArray } from '../../data' // Import pre-loaded data

interface CityBoundariesLayerProps {
  gemeentes: Gemeente[]
  onCitySelect: (city: City) => void
  debugEnabled?: boolean
}

// Component to create custom pane for city boundaries
const CityPaneSetter: React.FC = () => {
  const map = useMap()
  
  useEffect(() => {
    if (!map.getPane('city-boundaries')) {
      map.createPane('city-boundaries')
      map.getPane('city-boundaries')!.style.zIndex = '450' // Higher than overlayPane (400)
    }
  }, [map])
  
  return null
}

export const CityBoundariesLayer: React.FC<CityBoundariesLayerProps> = ({
  gemeentes,
  onCitySelect,
  debugEnabled = false
}) => {
  // No useState or useEffect needed! Data is already available from imports
  
  // Filter cities to only show those for currently visible gemeentes
  const visibleCities = cityArray.filter(city => 
    gemeentes.some(gemeente => gemeente.id === city.parent)
  )

  if (debugEnabled) {
    console.log(`🏙️ ${visibleCities.length} cities visible for current gemeentes`)
    console.log('Cities:', visibleCities.map(c => `${c.name} (${c.parent})`).join(', '))
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
          pane="city-boundaries" // Use custom pane for proper layering
          style={(() => {
            const colors = getMapBoundaryColors(city)
            return {
              fillColor: colors.fillColor,
              color: colors.borderColor,
              weight: 3,
              opacity: 1,
              fillOpacity: 0.6,
              dashArray: '8, 4' // Dashed pattern to distinguish cities from gemeentes
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
              
              if (debugEnabled) {
                console.log('🏙️ City hover:', city.name)
              }
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
      
      {/* Debug info overlay */}
      {debugEnabled && visibleCities.length > 0 && (
        <div className="absolute top-16 right-4 bg-orange-600/75 text-white p-2 rounded text-xs z-[2000] max-w-sm">
          <div className="font-semibold">🏙️ Cities Loaded</div>
          <div className="mt-1">Count: {visibleCities.length}</div>
          <div className="mt-1 text-xs max-h-20 overflow-y-auto">
            {visibleCities.map((city, index) => (
              <div key={city.id}>
                {index + 1}. {city.name} ({city.parent})
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
// src/pages/CityPage.tsx
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { City } from '../types/city'
import { useMapStore } from '../stores/mapStore'
import { calculateOptimalZoom } from '../utils/mapUtils'

declare global {
  interface Window {
    __selectedCityId?: string;
    __selectedGemeenteId?: string;
  }
}

interface CityPageProps {
  onCitySelect: (city: City) => void
}

export const CityPage: React.FC<CityPageProps> = ({ onCitySelect }) => {
  const { cityId } = useParams<{ cityId: string }>()
  const navigate = useNavigate()
  const { focusOnGemeente } = useMapStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!cityId) return

    const loadCity = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/data/city/${cityId}.json`)
        if (response.ok) {
          const city: City = await response.json()
          // Only update selection if not already selected
          if (!window.__selectedCityId || window.__selectedCityId !== city.id) {
            onCitySelect(city)
            window.__selectedCityId = city.id
          }
          if (city.coordinates) {
            const zoom = city.area ? calculateOptimalZoom(city.area) : 13
            focusOnGemeente([city.coordinates.lat, city.coordinates.lng], zoom)
          }
        } else {
          // City not found, redirect to home
          console.warn(`City ${cityId} not found, redirecting to home`)
          navigate('/', { replace: true })
        }
      } catch (error) {
        console.error('Error loading city:', error)
        navigate('/', { replace: true })
      } finally {
        setLoading(false)
      }
    }

    loadCity()
  }, [cityId, onCitySelect, focusOnGemeente, navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Stad laden...</p>
        </div>
      </div>
    )
  }

  return null // The actual UI is rendered by the parent App component
}
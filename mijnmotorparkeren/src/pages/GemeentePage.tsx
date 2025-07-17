// src/pages/GemeentePage.tsx
import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Gemeente } from '../types/gemeente'
import { useMapStore } from '../stores/mapStore'

declare global {
  interface Window {
    __selectedCityId?: string;
    __selectedGemeenteId?: string;
  }
}

interface GemeentePageProps {
  gemeentes: Gemeente[]
  onGemeenteSelect: (gemeente: Gemeente) => void
}

export const GemeentePage: React.FC<GemeentePageProps> = ({
  gemeentes,
  onGemeenteSelect
}) => {
  const { gemeenteId } = useParams<{ gemeenteId: string }>()
  const navigate = useNavigate()
  const { setSelectedGemeente, focusOnGemeente } = useMapStore()

  useEffect(() => {
    if (!gemeenteId || gemeentes.length === 0) return

    const gemeente = gemeentes.find(g => g.id === gemeenteId)
    // Only update selection if not already selected
    if (gemeente && (!window.__selectedGemeenteId || window.__selectedGemeenteId !== gemeente.id)) {
      onGemeenteSelect(gemeente)
      setSelectedGemeente(gemeente.id)
      window.__selectedGemeenteId = gemeente.id
      if (gemeente.coordinates) {
        focusOnGemeente([gemeente.coordinates.lat, gemeente.coordinates.lng], 12)
      }
    } else if (!gemeente) {
      // Gemeente not found, redirect to home
      console.warn(`Gemeente ${gemeenteId} not found, redirecting to home`)
      navigate('/', { replace: true })
    }
  }, [gemeenteId, gemeentes, onGemeenteSelect, setSelectedGemeente, focusOnGemeente, navigate])

  return null // The actual UI is rendered by the parent App component
}
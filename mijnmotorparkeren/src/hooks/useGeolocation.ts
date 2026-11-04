// src/hooks/useGeolocation.ts

import { useState, useEffect, useCallback } from 'react'
import type { LatLngExpression } from 'leaflet'

interface GeolocationState {
  location: LatLngExpression | null
  error: string | null
  loading: boolean
  supported: boolean
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
  watch?: boolean
}

interface UseGeolocationReturn extends GeolocationState {
  getCurrentLocation: () => Promise<LatLngExpression | null>
  clearError: () => void
}

function geoErrorMessage(err: unknown): string {
  switch ((err as GeolocationPositionError)?.code) {
    case 1:
      return 'Geen toegang tot je locatie. Sta locatie toe in je browserinstellingen.'
    case 2:
      return 'Je locatie is niet beschikbaar. Zoek je locatie via het zoekveld.'
    case 3:
      return 'Je locatie ophalen duurde te lang. Probeer het opnieuw.'
    default:
      return 'Je locatie ophalen is niet gelukt. Probeer het opnieuw.'
  }
}

export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationReturn {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 300000, // 5 minutes
    watch = false,
  } = options

  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    loading: false,
    supported: 'geolocation' in navigator,
  })

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  const getCurrentLocation = useCallback(async (): Promise<LatLngExpression | null> => {
    if (!state.supported) {
      const error = 'Je browser ondersteunt geen locatiebepaling. Zoek je locatie via het zoekveld.'
      setState((prev) => ({ ...prev, error }))
      return null
    }

    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy,
          timeout,
          maximumAge,
        })
      })

      const location: LatLngExpression = [position.coords.latitude, position.coords.longitude]

      setState((prev) => ({
        ...prev,
        location,
        loading: false,
        error: null,
      }))

      return location
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: geoErrorMessage(err),
      }))

      return null
    }
  }, [state.supported, enableHighAccuracy, timeout, maximumAge])

  // Set up position watching if enabled
  useEffect(() => {
    if (!watch || !state.supported) return

    let watchId: number

    const startWatching = () => {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const location: LatLngExpression = [position.coords.latitude, position.coords.longitude]
          setState((prev) => ({ ...prev, location, error: null }))
        },
        (err) => {
          setState((prev) => ({ ...prev, error: geoErrorMessage(err) }))
        },
        {
          enableHighAccuracy,
          timeout,
          maximumAge,
        }
      )
    }

    startWatching()

    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [watch, state.supported, enableHighAccuracy, timeout, maximumAge])

  return {
    ...state,
    getCurrentLocation,
    clearError,
  }
}

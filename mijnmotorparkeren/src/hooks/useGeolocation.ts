// src/hooks/useGeolocation.ts

import { useState, useEffect, useCallback } from 'react'
import { LatLngExpression } from 'leaflet'

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

export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationReturn {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 300000, // 5 minutes
    watch = false
  } = options

  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    loading: false,
    supported: 'geolocation' in navigator
  })

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  const getCurrentLocation = useCallback(async (): Promise<LatLngExpression | null> => {
    if (!state.supported) {
      const error = 'Geolocation is not supported by this browser'
      setState(prev => ({ ...prev, error }))
      return null
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy,
            timeout,
            maximumAge
          }
        )
      })

      const location: LatLngExpression = [
        position.coords.latitude,
        position.coords.longitude
      ]

      setState(prev => ({
        ...prev,
        location,
        loading: false,
        error: null
      }))

      return location
    } catch (err) {
      let errorMessage = 'Failed to get location'
      
      if (err instanceof GeolocationPositionError) {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user'
            break
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable'
            break
          case err.TIMEOUT:
            errorMessage = 'Location request timed out'
            break
          default:
            errorMessage = 'An unknown error occurred while retrieving location'
        }
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
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
          const location: LatLngExpression = [
            position.coords.latitude,
            position.coords.longitude
          ]
          setState(prev => ({ ...prev, location, error: null }))
        },
        (err) => {
          let errorMessage = 'Failed to watch location'
          
          if (err instanceof GeolocationPositionError) {
            switch (err.code) {
              case err.PERMISSION_DENIED:
                errorMessage = 'Location access denied by user'
                break
              case err.POSITION_UNAVAILABLE:
                errorMessage = 'Location information unavailable'
                break
              case err.TIMEOUT:
                errorMessage = 'Location request timed out'
                break
            }
          }
          
          setState(prev => ({ ...prev, error: errorMessage }))
        },
        {
          enableHighAccuracy,
          timeout,
          maximumAge
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
    clearError
  }
}
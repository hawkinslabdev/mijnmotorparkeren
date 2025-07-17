// src/stores/mapStore.ts

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { LatLngExpression } from 'leaflet'

interface MapState {
  // Map view state
  center: LatLngExpression
  zoom: number
  
  // Selected gemeente
  selectedGemeenteId: string | null
  
  // User location
  userLocation: LatLngExpression | null
  isLocationLoading: boolean
  locationError: string | null
  
  // Map interactions
  isInteracting: boolean
  
  // Actions
  setCenter: (center: LatLngExpression) => void
  setZoom: (zoom: number) => void
  setSelectedGemeente: (id: string | null) => void
  setUserLocation: (location: LatLngExpression | null) => void
  setLocationLoading: (loading: boolean) => void
  setLocationError: (error: string | null) => void
  setInteracting: (interacting: boolean) => void
  
  // Utility actions
  focusOnGemeente: (center: LatLngExpression, zoom?: number) => void
  resetView: () => void
}

// Get values from environment variables with fallbacks
const DEFAULT_CENTER: LatLngExpression = [
  parseFloat(import.meta.env.VITE_DEFAULT_CENTER_LAT) || 52.3676,
  parseFloat(import.meta.env.VITE_DEFAULT_CENTER_LNG) || 4.9041
]
const DEFAULT_ZOOM = parseInt(import.meta.env.VITE_DEFAULT_ZOOM) || 7

// Optional: Add console log to verify environment variables are loaded
console.log('🗺️ Map configuration loaded:', {
  center: DEFAULT_CENTER,
  zoom: DEFAULT_ZOOM,
  envVars: {
    lat: import.meta.env.VITE_DEFAULT_CENTER_LAT,
    lng: import.meta.env.VITE_DEFAULT_CENTER_LNG,
    zoom: import.meta.env.VITE_DEFAULT_ZOOM
  }
})

export const useMapStore = create<MapState>()(
  persist(
    (set) => ({
      // Initial state
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      selectedGemeenteId: null,
      userLocation: null,
      isLocationLoading: false,
      locationError: null,
      isInteracting: false,

      // Basic setters
      setCenter: (center) => set({ center }),
      setZoom: (zoom) => set({ zoom }),
      setSelectedGemeente: (id) => set({ selectedGemeenteId: id }),
      setUserLocation: (location) => set({ userLocation: location }),
      setLocationLoading: (loading) => set({ isLocationLoading: loading }),
      setLocationError: (error) => set({ locationError: error }),
      setInteracting: (interacting) => set({ isInteracting: interacting }),

      // Complex actions
      focusOnGemeente: (center, zoom = 12) => {
        set({ 
          center, 
          zoom,
          isInteracting: true
        })
        
        // Reset interaction state after animation
        setTimeout(() => {
          set({ isInteracting: false })
        }, 1000)
      },

      resetView: () => {
        set({
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          selectedGemeenteId: null,
          isInteracting: true
        })
        
        setTimeout(() => {
          set({ isInteracting: false })
        }, 1000)
      }
    }),
    {
      name: 'map-store',
      partialize: (state) => ({
        center: state.center,
        zoom: state.zoom,
        selectedGemeenteId: state.selectedGemeenteId
      })
    }
  )
)
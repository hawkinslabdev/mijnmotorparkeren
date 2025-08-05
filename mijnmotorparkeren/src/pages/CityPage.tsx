// src/pages/CityPage.tsx
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { City } from '../types/city'
import { useMapStore } from '../stores/mapStore'
import { calculateOptimalZoom } from '../utils/mapUtils'
import Seo from '../components/Seo'

interface CityPageProps {
  onCitySelect: (city: City) => void
}

export const CityPage: React.FC<CityPageProps> = ({ onCitySelect }) => {
  const { cityId } = useParams<{ cityId: string }>()
  const navigate = useNavigate()
  const { focusOnGemeente } = useMapStore()
  const [city, setCity] = useState<City | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!cityId) {
      navigate('/', { replace: true })
      return
    }

    const loadCity = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/data/city/${cityId}.json`)
        
        if (response.ok) {
          const cityData: City = await response.json()
          setCity(cityData)
          setNotFound(false)
          
          // Only update selection if not already selected
          if (!window.__selectedCityId || window.__selectedCityId !== cityData.id) {
            onCitySelect(cityData)
            window.__selectedCityId = cityData.id
          }
          
          if (cityData.coordinates) {
            const zoom = cityData.area ? calculateOptimalZoom(cityData.area) : 13
            focusOnGemeente([cityData.coordinates.lat, cityData.coordinates.lng], zoom)
          }
        } else {
          setNotFound(true)
          // Delay redirect to allow crawlers to see 404 content
          setTimeout(() => {
            console.warn(`City ${cityId} not found, redirecting to home`)
            navigate('/', { replace: true })
          }, 2000)
        }
      } catch (error) {
        console.error('Error loading city:', error)
        setNotFound(true)
        setTimeout(() => navigate('/', { replace: true }), 2000)
      } finally {
        setLoading(false)
      }
    }

    loadCity()
  }, [cityId, onCitySelect, focusOnGemeente, navigate])

  // Generate SEO data, works with or without loaded data
  const getSeoData = () => {
    if (!cityId) return null

    const cityName = city?.name || cityId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    const parentGemeente = city?.parent || 'Nederland'
    const canonical = `https://mijnmotorparkeren.nl/stad/${cityId}`

    if (notFound) {
      return {
        title: `Stad niet gevonden | MijnMotorParkeren.nl`,
        description: `De stad ${cityName} werd niet gevonden. Bekijk andere steden op MijnMotorParkeren.nl.`,
        canonical,
        noindex: true
      }
    }

    return {
      title: `Motor parkeren in ${cityName} | Parkeerregels`,
      description: `Mag de motor op de stoep in ${cityName} (gemeente ${parentGemeente})?`,
      canonical,
      keywords: `motor, parkeren, motor op de stoep, mijn motor parkeren, motor parkeren, ${cityName}`,
      schemaMarkup: {
        "@context": "https://schema.org",
        "@type": "Place",
        "name": cityName,
        "description": `Motor parkeerregels voor ${cityName}`,
        "url": canonical,
        "address": {
          "@type": "PostalAddress",
          "addressLocality": cityName,
          "addressCountry": "NL"
        },
        "containedInPlace": {
          "@type": "Place",
          "name": parentGemeente
        },
        ...(city?.coordinates && {
          "geo": {
            "@type": "GeoCoordinates",
            "latitude": city.coordinates.lat,
            "longitude": city.coordinates.lng
          }
        })
      }
    }
  }

  const seoData = getSeoData()

  // Show loading state with basic SEO
  if (loading) {
    const tempSeoData = getSeoData()
    return (
      <>
        {tempSeoData && (
          <Seo
            title={tempSeoData.title}
            description={tempSeoData.description}
            canonical={tempSeoData.canonical}
            keywords={tempSeoData.keywords}
            image="https://mijnmotorparkeren.nl/android-chrome-512x512.png"
            schemaMarkup={tempSeoData.schemaMarkup}
          />
        )}
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Stad laden...</p>
          </div>
        </div>
      </>
    )
  }

  // Always render SEO
  if (!seoData) {
    return (
      <Seo
        title="MijnMotorParkeren.nl"
        description="Motor parkeerregels Nederland"
        canonical="https://mijnmotorparkeren.nl/"
        noindex={true}
      />
    )
  }

  return (
    <Seo
      title={seoData.title}
      description={seoData.description}
      canonical={seoData.canonical}
      keywords={seoData.keywords}
      image="https://mijnmotorparkeren.nl/android-chrome-512x512.png"
      schemaMarkup={seoData.schemaMarkup}
      noindex={seoData.noindex}
    />
  )
}

// ============================================

// Global type declaration
declare global {
  interface Window {
    __selectedCityId?: string;
    __selectedGemeenteId?: string;
  }
}
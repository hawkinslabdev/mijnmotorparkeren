import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Gemeente } from '../types/gemeente'
import { useMapStore } from '../stores/mapStore'
import Seo from '../components/Seo'
import { getVersionedJsonUrl } from '../data/index'


interface GemeentePageProps {
  onCitySelect?: never // for type compatibility with other pages
  onGemeenteSelect: (gemeente: Gemeente) => void
}

export const GemeentePage: React.FC<GemeentePageProps> = ({ onGemeenteSelect }) => {
  const { gemeenteId } = useParams<{ gemeenteId: string }>()
  const navigate = useNavigate()
  const { setSelectedGemeente, focusOnGemeente } = useMapStore()
  const [gemeente, setGemeente] = useState<Gemeente | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!gemeenteId) {
      navigate('/', { replace: true })
      return
    }

    const loadGemeente = async () => {
      try {
        setLoading(true)
        const url = getVersionedJsonUrl('gemeentes', gemeenteId)
        const response = await fetch(url)
        if (response.ok) {
          const gemeenteData: Gemeente = await response.json()
          setGemeente(gemeenteData)
          setNotFound(false)
          // Only update selection if not already selected
          if (!window.__selectedGemeenteId || window.__selectedGemeenteId !== gemeenteData.id) {
            onGemeenteSelect(gemeenteData)
            setSelectedGemeente(gemeenteData.id)
            window.__selectedGemeenteId = gemeenteData.id
            if (gemeenteData.coordinates) {
              const zoom = typeof gemeenteData.zoom === 'number' ? gemeenteData.zoom : 12;
              focusOnGemeente([gemeenteData.coordinates.lat, gemeenteData.coordinates.lng], zoom)
            }
          }
        } else {
          setNotFound(true)
          setGemeente(null)
        }
      } catch {
        setNotFound(true)
        setGemeente(null)
      } finally {
        setLoading(false)
      }
    }
    loadGemeente()
  }, [gemeenteId, onGemeenteSelect, setSelectedGemeente, focusOnGemeente, navigate])

  // Generate SEO data - works with or without loaded data
  const getSeoData = () => {
    if (!gemeenteId) return null

    const gemeenteName = gemeente?.name || gemeenteId.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
    const canonical = `https://mijnmotorparkeren.nl/gemeente/${gemeenteId}`

    if (notFound) {
      return {
        title: `Gemeente niet gevonden | MijnMotorParkeren.nl`,
        description: `De gemeente ${gemeenteName} werd niet gevonden. Bekijk andere gemeenten op MijnMotorParkeren.nl.`,
        canonical,
        noindex: true
      }
    }

    return {
      title: `Motor parkeren in ${gemeenteName} | Parkeerregels`,
      description: `Mag de motor op de stoep in ${gemeenteName}?`,
      canonical,
      keywords: `motor, parkeren, motor op de stoep, mijn motor parkeren, motor parkeren, ${gemeenteName}`,
      schemaMarkup: {
        "@context": "https://schema.org",
        "@type": "Place",
        "name": gemeenteName,
        "description": `Motor parkeerregels voor gemeente ${gemeenteName}`,
        "url": canonical,
        "address": {
          "@type": "PostalAddress",
          "addressCountry": "NL",
          "addressLocality": gemeenteName
        },
        ...(gemeente?.coordinates && {
          "geo": {
            "@type": "GeoCoordinates",
            "latitude": gemeente?.coordinates?.lat,
            "longitude": gemeente?.coordinates?.lng
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
            <p className="text-gray-600">Gemeente laden...</p>
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

declare global {
  interface Window {
    __selectedCityId?: string;
    __selectedGemeenteId?: string;
  }
}
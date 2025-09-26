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
          // Extra check: does the loaded gemeente's id match the URL param?
          if (!gemeenteData.id || gemeenteData.id !== gemeenteId) {
            setNotFound(true)
            setGemeente(null)
            return;
          }
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

  // Generate SEO data based on current state
  const gemeenteName = gemeente?.name || (gemeenteId ? gemeenteId.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : '')
  const canonical = gemeenteId ? `https://mijnmotorparkeren.nl/gemeente/${gemeenteId}` : 'https://mijnmotorparkeren.nl/'

  let seoData
  if (loading) {
    seoData = {
      title: `Gemeente laden... | MijnMotorParkeren.nl`,
      description: `De gemeente ${gemeenteName} wordt geladen.`,
      canonical,
      noindex: false
    }
  } else if (notFound || !gemeente) {
    seoData = {
      title: `Gemeente niet gevonden | MijnMotorParkeren.nl`,
      description: `De gemeente ${gemeenteName} werd niet gevonden. Bekijk andere gemeenten op MijnMotorParkeren.nl.`,
      canonical,
      noindex: true
    }
  } else {
    seoData = {
      title: `Motor parkeren in ${gemeenteName} | Parkeerregels`,
      description: `Mag de motor op de stoep in ${gemeenteName}?`,
      canonical,
      keywords: `motor, parkeren, motor op de stoep, mijn motor parkeren, motor parkeren, ${gemeenteName}`,
      image: "https://mijnmotorparkeren.nl/android-chrome-512x512.png",
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

  // Always render SEO
  return (
    <Seo
      title={seoData.title}
      description={seoData.description}
      canonical={seoData.canonical}
      keywords={seoData.keywords}
      image={seoData.image || "https://mijnmotorparkeren.nl/android-chrome-512x512.png"}
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
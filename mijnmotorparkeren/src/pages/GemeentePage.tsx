import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Gemeente } from '../types/gemeente'
import { useMapStore } from '../stores/mapStore'
import Seo from '../components/Seo'

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
  const [gemeente, setGemeente] = useState<Gemeente | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!gemeenteId) {
      navigate('/', { replace: true })
      return
    }

    if (gemeentes.length === 0) {
      return
    }

    const foundGemeente = gemeentes.find(g => g.id === gemeenteId)
    
    if (foundGemeente) {
      setGemeente(foundGemeente)
      setNotFound(false)
      
      // Only update selection if not already selected
      if (!window.__selectedGemeenteId || window.__selectedGemeenteId !== foundGemeente.id) {
        onGemeenteSelect(foundGemeente)
        setSelectedGemeente(foundGemeente.id)
        window.__selectedGemeenteId = foundGemeente.id
        
        if (foundGemeente.coordinates) {
          focusOnGemeente([foundGemeente.coordinates.lat, foundGemeente.coordinates.lng], 12)
        }
      }
    } else {
      setNotFound(true)
      // Delay redirect to allow crawlers to see 404 content
      setTimeout(() => {
        console.warn(`Gemeente ${gemeenteId} not found, redirecting to home`)
        navigate('/', { replace: true })
      }, 2000)
    }
  }, [gemeenteId, gemeentes, onGemeenteSelect, setSelectedGemeente, focusOnGemeente, navigate])

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
      description: `Motor op de stoep? Alles over parkeren in ${gemeenteName}. Bekijk de parkeerregels voor motoren op MijnMotorParkeren.nl.`,
      canonical,
      keywords: `motor parkeren ${gemeenteName}, parkeerregels ${gemeenteName}, motorfiets ${gemeenteName}, motor op de stoep ${gemeenteName}, motor parkeren op straat ${gemeenteName}`,
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
            "latitude": gemeente.coordinates.lat,
            "longitude": gemeente.coordinates.lng
          }
        })
      }
    }
  }

  const seoData = getSeoData()

  // Always render SEO, even when loading or not found
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
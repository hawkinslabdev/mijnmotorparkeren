// src/pages/HomePage.tsx
import React from 'react'
import Seo from '../components/Seo'

export const HomePage: React.FC = () => {
  return (
    <>
      <Seo
        title="Motor parkeren Nederland | MijnMotorParkeren.nl"
        description="Bekijk het parkeerbeleid voor motor parkeren in Nederlandse gemeenten. Vind alle regels op MijnMotorParkeren.nl."
        canonical="https://mijnmotorparkeren.nl/"
        keywords="motor parkeren, motorfiets parkeren, parkeerregels, Nederland, gemeente, stoep parkeren"
        schemaMarkup={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "MijnMotorParkeren.nl",
          "description": "Platform voor het vinden van motor parkeerregels per gemeente in Nederland",
          "url": "https://mijnmotorparkeren.nl",
          "applicationCategory": "NavigationApplication",
          "operatingSystem": "Web Browser",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "EUR"
          }
        }}
      />
    </>
  )
}
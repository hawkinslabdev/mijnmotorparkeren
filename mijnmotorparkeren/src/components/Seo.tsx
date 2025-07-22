// src/components/Seo.tsx
import { Helmet } from 'react-helmet-async';
import React, { useEffect } from 'react';

interface SeoProps {
  title: string;
  description: string;
  canonical?: string;
  image?: string;
  schemaMarkup?: object;
  keywords?: string;
  author?: string;
  noindex?: boolean;
}

const Seo: React.FC<SeoProps> = ({ 
  title, 
  description, 
  canonical, 
  image, 
  schemaMarkup, 
  keywords = "motor parkeren, motorfiets parkeren, parkeerregels, Nederland, gemeente",
  author = "MijnMotorParkeren.nl",
  noindex = false
}) => {
  const cleanTitle = title.trim()
  const cleanDescription = description.trim()
  // Fixed: Use correct image path that matches your actual files
  const finalImage = image || `${window.location.origin}/android-chrome-512x512.png`

  // Manual DOM updates as fallback (since Helmet isn't working reliably)
  useEffect(() => {
    const timer = setTimeout(() => {
      // Update title
      if (document.title !== cleanTitle) {
        document.title = cleanTitle
      }
      
      // Update meta description
      const metaDesc = document.querySelector('meta[name="description"]')
      if (!metaDesc || metaDesc.getAttribute('content') !== cleanDescription) {
        const existingMeta = document.querySelector('meta[name="description"]')
        if (existingMeta) existingMeta.remove()
        
        const newMeta = document.createElement('meta')
        newMeta.name = 'description'
        newMeta.content = cleanDescription
        document.head.appendChild(newMeta)
      }

      // Update meta title
      const metaTitle = document.querySelector('meta[name="title"]')
      if (!metaTitle || metaTitle.getAttribute('content') !== cleanTitle) {
        const existingMetaTitle = document.querySelector('meta[name="title"]')
        if (existingMetaTitle) existingMetaTitle.remove()
        
        const newMetaTitle = document.createElement('meta')
        newMetaTitle.name = 'title'
        newMetaTitle.content = cleanTitle
        document.head.appendChild(newMetaTitle)
      }

      // Update og:image
      const ogImage = document.querySelector('meta[property="og:image"]')
      if (!ogImage || ogImage.getAttribute('content') !== finalImage) {
        const existingOgImage = document.querySelector('meta[property="og:image"]')
        if (existingOgImage) existingOgImage.remove()
        
        const newOgImage = document.createElement('meta')
        newOgImage.setAttribute('property', 'og:image')
        newOgImage.content = finalImage
        document.head.appendChild(newOgImage)
      }

      // Update twitter:image
      const twitterImage = document.querySelector('meta[name="twitter:image"]')
      if (!twitterImage || twitterImage.getAttribute('content') !== finalImage) {
        const existingTwitterImage = document.querySelector('meta[name="twitter:image"]')
        if (existingTwitterImage) existingTwitterImage.remove()
        
        const newTwitterImage = document.createElement('meta')
        newTwitterImage.name = 'twitter:image'
        newTwitterImage.content = finalImage
        document.head.appendChild(newTwitterImage)
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [cleanTitle, cleanDescription, finalImage])
  
  return (
    <Helmet>
      {/* Keep Helmet for other meta tags and potential SSR */}
      <title key={`title-${cleanTitle}`}>{cleanTitle}</title>
      <meta key={`meta-title-${cleanTitle}`} name="title" content={cleanTitle} />
      <meta key={`meta-desc-${cleanDescription}`} name="description" content={cleanDescription} />
      <meta key={`meta-keywords-${keywords}`} name="keywords" content={keywords} />
      <meta name="author" content={author} />
      
      {canonical && <link key={`canonical-${canonical}`} rel="canonical" href={canonical} />}
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      
      {/* Open Graph */}
      <meta key={`og-title-${cleanTitle}`} property="og:title" content={cleanTitle} />
      <meta key={`og-desc-${cleanDescription}`} property="og:description" content={cleanDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical || window.location.href} />
      <meta key={`og-image-${finalImage}`} property="og:image" content={finalImage} />
      <meta property="og:image:width" content="512" />
      <meta property="og:image:height" content="512" />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:site_name" content="MijnMotorParkeren.nl" />
      <meta property="og:locale" content="nl_NL" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta key={`twitter-title-${cleanTitle}`} name="twitter:title" content={cleanTitle} />
      <meta key={`twitter-desc-${cleanDescription}`} name="twitter:description" content={cleanDescription} />
      <meta key={`twitter-image-${finalImage}`} name="twitter:image" content={finalImage} />
      
      {/* Schema markup */}
      {schemaMarkup && (
        <script key={`schema-${JSON.stringify(schemaMarkup).slice(0, 50)}`} type="application/ld+json">
          {JSON.stringify(schemaMarkup)}
        </script>
      )}
    </Helmet>
  )
}

export default Seo
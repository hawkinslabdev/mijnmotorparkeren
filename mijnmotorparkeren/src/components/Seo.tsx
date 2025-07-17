import { Helmet } from 'react-helmet-async';
import React from 'react';

interface SeoProps {
  title: string;
  description: string;
  canonical?: string;
  image?: string;
  schemaMarkup?: object;
}

const Seo: React.FC<SeoProps> = ({ title, description, canonical, image, schemaMarkup }) => (
  <Helmet>
    <title>{title}</title>
    <meta name="description" content={description} />
    {canonical && <link rel="canonical" href={canonical} />}
    {image && <meta property="og:image" content={image} />}
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />
    {image && <meta name="twitter:image" content={image} />}
    {schemaMarkup && (
      <script type="application/ld+json">
        {JSON.stringify(schemaMarkup)}
      </script>
    )}
  </Helmet>
);

export default Seo;

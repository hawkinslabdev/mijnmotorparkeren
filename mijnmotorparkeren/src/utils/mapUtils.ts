import type { FeatureCollection, Polygon, MultiPolygon } from 'geojson'

/**
 * Calculate appropriate zoom level based on GeoJSON boundary size (using haversine distance)
 */
export const calculateOptimalZoom = (area: FeatureCollection): number => {
  try {
    const feature = area?.features?.[0]
    if (!feature || !feature.geometry) {
      return 13 
    }

    let coordinates: number[][] = []
    if (feature.geometry.type === 'Polygon') {
      coordinates = (feature.geometry as Polygon).coordinates[0]
    } else if (feature.geometry.type === 'MultiPolygon') {
      coordinates = (feature.geometry as MultiPolygon).coordinates[0][0]
    } else {
      return 13 
    }

    let minLat = Infinity, maxLat = -Infinity
    let minLng = Infinity, maxLng = -Infinity

    coordinates.forEach((coord) => {
      if (coord.length < 2) return
      const [lng, lat] = coord
      minLat = Math.min(minLat, lat)
      maxLat = Math.max(maxLat, lat)
      minLng = Math.min(minLng, lng)
      maxLng = Math.max(maxLng, lng)
    })

    // Haversine distance between SW and NE corners
    const toRad = (v: number) => v * Math.PI / 180
    const R = 6371 // Earth radius in km
    const dLat = toRad(maxLat - minLat)
    const dLng = toRad(maxLng - minLng)
    const a = Math.sin(dLat/2) ** 2 +
              Math.cos(toRad(minLat)) * Math.cos(toRad(maxLat)) *
              Math.sin(dLng/2) ** 2
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const diagonalKm = R * c

    // Adjusted zoom thresholds (tune as needed)
    if (diagonalKm > 10) return 11
    if (diagonalKm > 5) return 12
    if (diagonalKm > 2) return 13
    if (diagonalKm > 1) return 14
    return 15
  } catch (error) {
    console.warn('Error calculating zoom:', error)
    return 13
  }
}

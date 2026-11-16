import type { APIRoute } from 'astro'
import { getIndex } from './index.json'

// shields.io endpoint badge format
export const GET: APIRoute = async () => {
  const { gemeentes } = JSON.parse(await getIndex()) as {
    gemeentes: { type?: string; parkingStatus: string }[]
  }
  const all = gemeentes.filter((g) => g.type !== 'country')
  const known = all.filter((g) => g.parkingStatus !== 'no_info').length
  return new Response(
    JSON.stringify({
      schemaVersion: 1,
      label: 'municipalities',
      message: `${known} of ${all.length}`,
      color: 'blue',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    }
  )
}

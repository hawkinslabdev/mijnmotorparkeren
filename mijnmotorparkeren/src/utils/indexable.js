// Shared by SSR pages and sitemap
const STUB_NOTES = 'Er zijn geen gegevens over parkeerregels beschikbaar voor deze gemeente.'

export const isThinGemeente = (gemeente) => {
  const notes = gemeente.parkingRules?.motorcycleSpecific?.notes
  return !gemeente.lastUpdated && !gemeente.sources?.length && (!notes || notes === STUB_NOTES)
}
export const isThinCity = (city) => !city.parkingRules

export const slugify = (name) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/'/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

// Places with rules get a page
export const landingSlugs = (gemeente) =>
  isThinGemeente(gemeente) ? [] : (gemeente.alternativeNames ?? []).map(slugify)

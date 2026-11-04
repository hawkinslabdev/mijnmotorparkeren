// Shared by SSR pages and sitemap
const STUB_NOTES = 'Er zijn geen gegevens over parkeerregels beschikbaar voor deze gemeente.'

export const isThinGemeente = (gemeente) => {
  const notes = gemeente.parkingRules?.motorcycleSpecific?.notes
  return !gemeente.lastUpdated && !gemeente.sources?.length && (!notes || notes === STUB_NOTES)
}
export const isThinCity = (city) => !city.parkingRules

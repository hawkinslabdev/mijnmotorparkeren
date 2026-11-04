import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { landingSlugs, slugify } from './indexable.js'

export interface GemeenteAlias {
  name: string
  gemeente: { id: string; name: string; [key: string]: unknown }
  hasLanding: boolean
}

let cache: Map<string, GemeenteAlias> | null = null

async function loadAliases(): Promise<Map<string, GemeenteAlias>> {
  const dir = path.join(process.cwd(), 'data', 'gemeentes')
  const aliases = new Map<string, GemeenteAlias>()
  for (const file of await readdir(dir)) {
    if (!file.endsWith('.json')) continue
    const gemeente = JSON.parse(await readFile(path.join(dir, file), 'utf-8'))
    const landings = landingSlugs(gemeente)
    for (const name of [
      ...(gemeente.alternativeNames ?? []),
      ...(gemeente.searchOnlyNames ?? []),
    ]) {
      const slug = slugify(name)
      aliases.set(slug, { name, gemeente, hasLanding: landings.includes(slug) })
    }
  }
  return aliases
}

/** Gemeente that lists this slug as a place. */
export async function findGemeenteByAlias(slug: string): Promise<GemeenteAlias | undefined> {
  if (!cache || import.meta.env.DEV) cache = await loadAliases()
  return cache.get(slug)
}

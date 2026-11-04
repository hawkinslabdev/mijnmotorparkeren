import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const source = readFileSync(join(import.meta.dirname, '../public/sw.js'), 'utf-8')
const ORIGIN = 'https://mijnmotorparkeren.nl'

type Listener = (event: Record<string, unknown>) => void

function loadWorker(fetchMock: (request: unknown) => Promise<Response>) {
  const listeners: Record<string, Listener> = {}
  const store = new Map<string, Response>()
  const keyOf = (req: { url?: string } | string) =>
    typeof req === 'string' ? new URL(req, ORIGIN).href : (req.url as string)
  const cache = {
    match: async (req: { url: string } | string, opts?: { ignoreSearch?: boolean }) => {
      const key = keyOf(req)
      if (!opts?.ignoreSearch) return store.get(key)?.clone()
      const bare = key.split('?')[0]
      for (const [k, v] of store) if (k.split('?')[0] === bare) return v.clone()
    },
    put: async (req: { url: string }, res: Response) => void store.set(keyOf(req), res),
    add: vi.fn(async () => {}),
  }
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, fn: Listener) => (listeners[type] = fn),
    skipWaiting: () => {},
    clients: { claim: async () => {} },
  }
  runInNewContext(source, {
    self,
    caches: { open: async () => cache, keys: async () => [], delete: async () => true },
    fetch: fetchMock,
    URL,
    Response,
    Promise,
    setTimeout,
  })

  const dispatch = (url: string, mode = 'cors') => {
    let responded: Promise<Response> | undefined
    listeners.fetch({
      request: { url, method: 'GET', mode },
      respondWith: (r: Promise<Response>) => (responded = r),
    })
    return responded
  }
  return { dispatch, store, cache, listeners }
}

describe('service worker', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('ignores cross-origin requests', () => {
    const { dispatch } = loadWorker(async () => new Response('tile'))
    expect(dispatch('https://tile.openstreetmap.org/1/1/1.png')).toBeUndefined()
  })

  it('serves cached data when the network fails', async () => {
    const fetchMock = vi
      .fn<(r: unknown) => Promise<Response>>()
      .mockResolvedValueOnce(new Response('fresh'))
      .mockRejectedValue(new TypeError('offline'))
    const { dispatch } = loadWorker(fetchMock)
    const url = `${ORIGIN}/data/index.json?v=1`

    expect(await (await dispatch(url))!.text()).toBe('fresh')
    await new Promise((resolve) => setTimeout(resolve))
    expect(await (await dispatch(url))!.text()).toBe('fresh')
  })

  it('finds data cached under another version', async () => {
    const fetchMock = vi
      .fn<(r: unknown) => Promise<Response>>()
      .mockResolvedValueOnce(new Response('old'))
      .mockRejectedValue(new TypeError('offline'))
    const { dispatch } = loadWorker(fetchMock)

    await dispatch(`${ORIGIN}/data/index.json?v=1`)
    await new Promise((resolve) => setTimeout(resolve))
    const res = await dispatch(`${ORIGIN}/data/index.json?v=2`)
    expect(await res!.text()).toBe('old')
  })

  it('rejects uncached data so the app can react', async () => {
    const { dispatch } = loadWorker(async () => {
      throw new TypeError('offline')
    })
    await expect(dispatch(`${ORIGIN}/data/gemeentes/ede.json`)).rejects.toThrow('offline')
  })

  it('shows a Dutch page for uncached navigation', async () => {
    const { dispatch } = loadWorker(async () => {
      throw new TypeError('offline')
    })
    const res = await dispatch(`${ORIGIN}/gemeente/ede`, 'navigate')
    expect(res!.status).toBe(503)
    expect(await res!.text()).toContain('Je bent offline')
  })

  it('never precaches other origins', async () => {
    const { listeners, cache } = loadWorker(async () => new Response('x'))
    const pending: Promise<unknown>[] = []
    listeners.message({
      data: { type: 'CACHE_URLS', urls: ['/', 'https://evil.example/x.js'] },
      waitUntil: (p: Promise<unknown>) => pending.push(p),
    })
    await Promise.all(pending)
    expect(cache.add).toHaveBeenCalledTimes(1)
    expect(cache.add).toHaveBeenCalledWith('/')
  })
})

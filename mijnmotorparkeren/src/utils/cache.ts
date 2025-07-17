// src/utils/cache.ts

interface CacheOptions {
  maxAge?: number // in milliseconds
  storage?: 'localStorage' | 'sessionStorage'
}

class DataCache {
  private storage: Storage
  private maxAge: number

  constructor(options: CacheOptions = {}) {
    this.storage = options.storage === 'sessionStorage' 
      ? sessionStorage 
      : localStorage
    this.maxAge = options.maxAge || 1000 * 60 * 60 * 24 // 24 hours default
  }

  set<T>(key: string, data: T): void {
    try {
      const item = {
        data,
        timestamp: Date.now(),
        maxAge: this.maxAge
      }
      this.storage.setItem(key, JSON.stringify(item))
    } catch (error) {
      console.warn('Failed to cache data:', error)
    }
  }

  get<T>(key: string): T | null {
    try {
      const item = this.storage.getItem(key)
      if (!item) return null

      const parsed = JSON.parse(item)
      const now = Date.now()
      
      // Check if item has expired
      if (now - parsed.timestamp > parsed.maxAge) {
        this.remove(key)
        return null
      }

      return parsed.data
    } catch (error) {
      console.warn('Failed to retrieve cached data:', error)
      return null
    }
  }

  remove(key: string): void {
    try {
      this.storage.removeItem(key)
    } catch (error) {
      console.warn('Failed to remove cached data:', error)
    }
  }

  clear(): void {
    try {
      // Only clear items that belong to our app
      const keys = []
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i)
        if (key?.startsWith('gemeente-') || key?.startsWith('map-') || key?.startsWith('search-')) {
          keys.push(key)
        }
      }
      keys.forEach(key => this.storage.removeItem(key))
    } catch (error) {
      console.warn('Failed to clear cache:', error)
    }
  }

  // Get cache size in bytes (approximate)
  getSize(): number {
    let size = 0
    try {
      for (let key in this.storage) {
        if (Object.prototype.hasOwnProperty.call(this.storage, key)) {
          size += this.storage[key].length + key.length
        }
      }
    } catch (error) {
      console.warn('Failed to calculate cache size:', error)
    }
    return size
  }
}

// Export default cache instances
export const gemeenteCache = new DataCache({
  maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week for gemeente data
  storage: 'localStorage'
})

export const searchCache = new DataCache({
  maxAge: 1000 * 60 * 30, // 30 minutes for search results
  storage: 'sessionStorage'
})
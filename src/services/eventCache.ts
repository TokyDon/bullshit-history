import type { HistoricalEvent } from '../types/game';

const CACHE_KEY = 'bullshit_history_events_cache';
const CACHE_VERSION = 1;
const MAX_CACHE_SIZE = 500; // Store up to 500 events

interface CachedEvent extends HistoricalEvent {
  cachedAt: number;
}

interface EventCache {
  version: number;
  events: Record<string, CachedEvent>;
}

/**
 * Get the event cache from localStorage
 */
function getCache(): EventCache {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) {
      return { version: CACHE_VERSION, events: {} };
    }

    const parsed = JSON.parse(cached) as EventCache;
    
    // Clear cache if version mismatch
    if (parsed.version !== CACHE_VERSION) {
      return { version: CACHE_VERSION, events: {} };
    }

    return parsed;
  } catch (error) {
    console.error('Error reading cache:', error);
    return { version: CACHE_VERSION, events: {} };
  }
}

/**
 * Save the event cache to localStorage
 */
function saveCache(cache: EventCache): void {
  try {
    // Limit cache size
    const eventKeys = Object.keys(cache.events);
    if (eventKeys.length > MAX_CACHE_SIZE) {
      // Remove oldest entries
      const sortedKeys = eventKeys.sort((a, b) => {
        return cache.events[a].cachedAt - cache.events[b].cachedAt;
      });
      
      const toRemove = sortedKeys.slice(0, eventKeys.length - MAX_CACHE_SIZE);
      toRemove.forEach(key => delete cache.events[key]);
    }

    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error saving cache:', error);
  }
}

/**
 * Normalize event name for cache key
 */
function normalizeEventName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Get a cached event by name
 */
export function getCachedEvent(eventName: string): HistoricalEvent | null {
  const cache = getCache();
  const key = normalizeEventName(eventName);
  const cached = cache.events[key];

  if (!cached) return null;

  // Return without the cachedAt timestamp
  const { cachedAt, ...event } = cached;
  
  // Reconstruct Date object
  return {
    ...event,
    date: new Date(event.date),
  };
}

/**
 * Cache an event
 */
export function cacheEvent(eventName: string, event: HistoricalEvent): void {
  const cache = getCache();
  const key = normalizeEventName(eventName);

  cache.events[key] = {
    ...event,
    date: event.date.toISOString() as any, // Store as string for JSON
    cachedAt: Date.now(),
  };

  saveCache(cache);
}

/**
 * Cache multiple events
 */
export function cacheEvents(events: Array<{ name: string; event: HistoricalEvent }>): void {
  const cache = getCache();

  events.forEach(({ name, event }) => {
    const key = normalizeEventName(name);
    cache.events[key] = {
      ...event,
      date: event.date.toISOString() as any,
      cachedAt: Date.now(),
    };
  });

  saveCache(cache);
}

/**
 * Clear the entire cache
 */
export function clearCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; maxSize: number } {
  const cache = getCache();
  return {
    size: Object.keys(cache.events).length,
    maxSize: MAX_CACHE_SIZE,
  };
}

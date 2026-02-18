import axios from 'axios';
import type { HistoricalEvent } from '../types/game';

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';

interface WikidataSearchResult {
  id: string;
  label: string;
  description?: string;
}

interface WikidataEntity {
  labels?: {
    en?: { value: string };
  };
  claims?: {
    [property: string]: Array<{
      mainsnak: {
        datavalue?: {
          value: any;
          type: string;
        };
      };
    }>;
  };
}

/**
 * Search for entities in Wikidata
 */
async function searchWikidata(query: string, limit: number = 10): Promise<WikidataSearchResult[]> {
  try {
    console.log('[Wikidata] Searching for:', query);
    const response = await axios.get(WIKIDATA_API, {
      params: {
        action: 'wbsearchentities',
        search: query,
        language: 'en',
        format: 'json',
        limit,
      },
    });

    if (response.data?.search) {
      const results = response.data.search.map((item: any) => ({
        id: item.id,
        label: item.label || item.display?.label?.value,
        description: item.description || item.display?.description?.value,
      }));
      console.log('[Wikidata] Found results:', results.length, results.map((r: any) => r.label));
      return results;
    }

    console.log('[Wikidata] No results found');
    return [];
  } catch (error) {
    console.error('Wikidata search error:', error);
    return [];
  }
}

/**
 * Get entity details from Wikidata
 */
async function getEntityDetails(entityId: string): Promise<WikidataEntity | null> {
  try {
    const response = await axios.get(WIKIDATA_API, {
      params: {
        action: 'wbgetentities',
        ids: entityId,
        format: 'json',
        props: 'labels|descriptions|claims',
        languages: 'en',
      },
    });

    if (response.data?.entities?.[entityId]) {
      return response.data.entities[entityId];
    }

    return null;
  } catch (error) {
    console.error('Wikidata entity fetch error:', error);
    return null;
  }
}

/**
 * Extract date from Wikidata claims
 * Looks for P585 (point in time), P580 (start time), P571 (inception)
 */
function extractDate(claims: any): { year: number; month: number; day: number } | null {
  // P585 = point in time
  if (claims.P585 && claims.P585[0]?.mainsnak?.datavalue) {
    const timeValue = claims.P585[0].mainsnak.datavalue.value;
    return parseWikidataTime(timeValue.time);
  }

  // P580 = start time
  if (claims.P580 && claims.P580[0]?.mainsnak?.datavalue) {
    const timeValue = claims.P580[0].mainsnak.datavalue.value;
    return parseWikidataTime(timeValue.time);
  }

  // P571 = inception
  if (claims.P571 && claims.P571[0]?.mainsnak?.datavalue) {
    const timeValue = claims.P571[0].mainsnak.datavalue.value;
    return parseWikidataTime(timeValue.time);
  }

  return null;
}

/**
 * Parse Wikidata time format: "+2004-02-01T00:00:00Z"
 */
function parseWikidataTime(timeString: string): { year: number; month: number; day: number } | null {
  try {
    // Remove leading + and parse
    const cleaned = timeString.replace(/^\+/, '');
    const date = new Date(cleaned);
    
    if (isNaN(date.getTime())) {
      return null;
    }

    return {
      year: date.getFullYear(),
      month: date.getMonth(), // 0-indexed for JS Date
      day: date.getDate(),
    };
  } catch {
    return null;
  }
}

/**
 * Get instance types for classification
 * P31 = instance of
 */
async function getEventTypes(claims: any): Promise<string[]> {
  if (!claims.P31) return [];

  const typeIds = claims.P31
    .map((claim: any) => claim.mainsnak?.datavalue?.value?.id)
    .filter(Boolean);

  if (typeIds.length === 0) return [];

  try {
    const response = await axios.get(WIKIDATA_API, {
      params: {
        action: 'wbgetentities',
        ids: typeIds.join('|'),
        format: 'json',
        props: 'labels',
        languages: 'en',
      },
    });

    const types: string[] = [];
    for (const id of typeIds) {
      const entity = response.data?.entities?.[id];
      if (entity?.labels?.en?.value) {
        types.push(entity.labels.en.value);
      }
    }

    return types;
  } catch (error) {
    console.error('Error fetching event types:', error);
    return [];
  }
}

/**
 * Check if an entity is a valid historical event
 */
function isValidEvent(_entity: WikidataEntity, types: string[]): boolean {
  // Exclude pure geographic entities
  const excludedTypes = [
    'country',
    'city',
    'town',
    'village',
    'state',
    'province',
    'continent',
    'river',
    'mountain',
    'language',
    'religion',
    'political party',
    'organization',
    'company',
    'business',
  ];

  const hasExcludedType = types.some(type => 
    excludedTypes.some(excluded => type.toLowerCase().includes(excluded.toLowerCase()))
  );

  if (hasExcludedType) return false;

  // Accept if it has event-related types
  const eventTypes = [
    'battle',
    'war',
    'conflict',
    'treaty',
    'disaster',
    'earthquake',
    'revolution',
    'assassination',
    'controversy',
    'scandal',
    'incident',
    'protest',
    'ceremony',
    'trial',
    'election',
    'coup',
    'invasion',
    'siege',
    'rebellion',
    'uprising',
    'attack',
    'explosion',
    'fire',
    'flood',
    'hurricane',
    'tornado',
    'volcanic eruption',
    'accident',
    'crash',
    'collision',
    'performance',
    'concert',
    'sporting event',
    'competition',
    'championship',
  ];

  const hasEventType = types.some(type =>
    eventTypes.some(event => type.toLowerCase().includes(event.toLowerCase()))
  );

  return hasEventType || types.length === 0; // Allow if no types found (fallback)
}

/**
 * Convert Wikidata entity to HistoricalEvent
 */
async function entityToHistoricalEvent(
  entity: WikidataEntity,
  _entityId: string
): Promise<HistoricalEvent | null> {
  if (!entity.claims) {
    console.log('[Wikidata] No claims found');
    return null;
  }

  const dateInfo = extractDate(entity.claims);
  if (!dateInfo) {
    console.log('[Wikidata] No date found in claims');
    return null;
  }

  const types = await getEventTypes(entity.claims);
  console.log('[Wikidata] Event types:', types);
  
  if (!isValidEvent(entity, types)) {
    console.log('[Wikidata] Event validation failed');
    return null;
  }

  const title = entity.labels?.en?.value;
  if (!title) {
    console.log('[Wikidata] No title found');
    return null;
  }

  console.log('[Wikidata] Successfully created event:', title, dateInfo);
  return {
    title,
    date: new Date(dateInfo.year, dateInfo.month, dateInfo.day),
    year: dateInfo.year,
    month: dateInfo.month,
    day: dateInfo.day,
    wikipediaUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
  };
}

/**
 * Search for a historical event and return structured data
 */
export async function searchHistoricalEvent(
  eventName: string
): Promise<HistoricalEvent | null> {
  const results = await searchWikidata(eventName, 10);
  
  if (results.length === 0) return null;

  for (const result of results) {
    const entity = await getEntityDetails(result.id);
    if (!entity) continue;

    const event = await entityToHistoricalEvent(entity, result.id);
    if (event) return event;
  }

  return null;
}

/**
 * Search for multiple historical event options (up to 3)
 */
export async function searchHistoricalEventOptions(
  eventName: string
): Promise<HistoricalEvent[]> {
  console.log('[Wikidata] searchHistoricalEventOptions called with:', eventName);
  const results = await searchWikidata(eventName, 10);
  
  if (results.length === 0) {
    console.log('[Wikidata] No search results');
    return [];
  }

  const events: HistoricalEvent[] = [];
  const maxOptions = 3;

  for (const result of results) {
    if (events.length >= maxOptions) break;

    console.log('[Wikidata] Fetching entity:', result.id, result.label);
    const entity = await getEntityDetails(result.id);
    if (!entity) {
      console.log('[Wikidata] Failed to get entity details');
      continue;
    }

    const event = await entityToHistoricalEvent(entity, result.id);
    if (event) {
      events.push(event);
    }
  }

  console.log('[Wikidata] Total events found:', events.length);
  return events;
}

/**
 * Get a starting event for a specific century
 * Uses Wikidata's query service for more targeted results
 */
export async function getStartingEventFromCentury(
  century: number
): Promise<HistoricalEvent | null> {
  const startYear = (century - 1) * 100;
  const endYear = startYear + 99;
  
  // Search for notable events from this century
  const searchTerms = [
    `${century}th century battle`,
    `${century}th century war`,
    `${startYear} historical event`,
  ];

  for (const term of searchTerms) {
    const results = await searchWikidata(term, 15);
    
    for (const result of results) {
      const entity = await getEntityDetails(result.id);
      if (!entity) continue;

      const event = await entityToHistoricalEvent(entity, result.id);
      if (event && event.year >= startYear && event.year <= endYear) {
        return event;
      }
    }
  }

  return null;
}

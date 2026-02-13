import axios from 'axios';
import type { HistoricalEvent } from '../types/game';

const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php';

export interface WikipediaSearchResult {
  title: string;
  pageid: number;
  snippet: string;
}

/**
 * Check if a page title represents a time period or meta content that should be excluded
 * Examples: "21st century", "1990s", "2024", "January 2020", "List of wars"
 */
function isTimePeriodOrMetaPage(title: string): boolean {
  return (
    /^(List of|Timeline of|Category:|Index of)/i.test(title) ||
    /^\d+(st|nd|rd|th) century$/i.test(title) ||        // "21st century"
    /^\d{4}s?$/i.test(title) ||                         // "1990s", "2000"
    /^\d+(st|nd|rd|th) millennium$/i.test(title) ||     // "2nd millennium"
    /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/i.test(title) || // "January 2020"
    /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}$/i.test(title) || // "January 15"
    /^\d{4}$/i.test(title) ||                           // "2000"
    /^AD \d+$/i.test(title) ||                          // "AD 1000"
    /^BC \d+$/i.test(title)                             // "BC 500"
  );
}

/**
 * Search Wikipedia for events matching the user's query
 */
export async function searchWikipediaEvents(
  query: string,
  limit = 10
): Promise<WikipediaSearchResult[]> {
  try {
    const response = await axios.get(WIKIPEDIA_API, {
      params: {
        action: 'query',
        list: 'search',
        srsearch: query,
        format: 'json',
        origin: '*',
        srlimit: limit,
      },
    });

    return response.data.query.search;
  } catch (error) {
    console.error('Wikipedia search error:', error);
    return [];
  }
}

/**
 * Get detailed information about a Wikipedia page including the event date
 */
export async function getEventDetails(
  pageTitle: string
): Promise<HistoricalEvent | null> {
  try {
    // Exclude time period pages and meta content by title
    if (isTimePeriodOrMetaPage(pageTitle)) {
      return null;
    }

    // Get page content and extract date information
    // For wars and long events, we need more than just the intro to find specific dates
    const response = await axios.get(WIKIPEDIA_API, {
      params: {
        action: 'query',
        titles: pageTitle,
        prop: 'extracts|info|categories',
        exintro: false, // Get full text, not just intro - we need this to find dates in war articles
        explaintext: true,
        exsentences: 10, // Get first 10 sentences which should include dates
        inprop: 'url',
        cllimit: 50,
        format: 'json',
        origin: '*',
      },
    });

    const pages = response.data.query.pages;
    const page = Object.values(pages)[0] as any;

    if (!page || page.missing) {
      return null;
    }

    // Check if this is a biographical page (person)
    const biographicalInfo = extractBiographicalDate(page.extract, page.title);
    if (biographicalInfo) {
      return biographicalInfo;
    }

    // Check if this is actually a historical event
    if (!isHistoricalEvent(page.extract, page.categories)) {
      return null;
    }

    // Extract date from the content (this is a simplified approach)
    // In production, you'd want more sophisticated date extraction
    const dateInfo = extractDateFromText(page.extract);

    if (!dateInfo) {
      return null;
    }

    // Apply title prefix if event is from a date range
    const eventTitle = dateInfo.titlePrefix 
      ? `${dateInfo.titlePrefix} ${page.title}`
      : page.title;

    return {
      title: eventTitle,
      date: dateInfo.date,
      year: dateInfo.year,
      month: dateInfo.month,
      day: dateInfo.day,
      wikipediaUrl: page.fullurl,
      description: page.extract,
    };
  } catch (error) {
    console.error('Error fetching event details:', error);
    return null;
  }
}

/**
 * Extract birth or death date from biographical pages
 * Returns event with modified title like "Birth of [Person]" or "Death of [Person]"
 */
function extractBiographicalDate(
  text: string,
  personName: string
): HistoricalEvent | null {
  if (!text) return null;

  const lowerText = text.toLowerCase();

  // Check if this is a biographical page
  const isBiographical =
    /\b(was|is) a (person|politician|writer|author|artist|musician|actor|scientist|philosopher|composer|director|inventor|explorer|emperor|king|queen|president|general)\b/i.test(
      lowerText
    ) ||
    /\b(was born|born in|born on)\b/i.test(lowerText) ||
    /\b(died|death)\b/i.test(lowerText);

  if (!isBiographical) {
    return null;
  }

  // Try to extract birth date
  // Pattern: "born 15 April 1452" or "was born on April 15, 1452"
  const birthPattern1 =
    /\b(?:was )?born\s+(?:on\s+)?(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{3,4})\b/i;
  const birthMatch1 = text.match(birthPattern1);

  if (birthMatch1) {
    const day = parseInt(birthMatch1[1]);
    const month = getMonthNumber(birthMatch1[2]);
    const year = parseInt(birthMatch1[3]);
    if (!isValidCompleteDate(year, month, day)) return null;
    return {
      title: `Birth of ${personName}`,
      date: new Date(year, month, day),
      year,
      month,
      day,
      wikipediaUrl: '',
      description: text,
    };
  }

  // Pattern: "born April 15, 1452"
  const birthPattern2 =
    /\b(?:was )?born\s+(?:on\s+)?(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{3,4})\b/i;
  const birthMatch2 = text.match(birthPattern2);

  if (birthMatch2) {
    const month = getMonthNumber(birthMatch2[1]);
    const day = parseInt(birthMatch2[2]);
    const year = parseInt(birthMatch2[3]);
    if (!isValidCompleteDate(year, month, day)) return null;
    return {
      title: `Birth of ${personName}`,
      date: new Date(year, month, day),
      year,
      month,
      day,
      wikipediaUrl: '',
      description: text,
    };
  }

  // Try to extract death date
  // Pattern: "died 23 April 1616" or "died on April 23, 1616"
  const deathPattern1 =
    /\b(?:died|death)\s+(?:on\s+)?(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{3,4})\b/i;
  const deathMatch1 = text.match(deathPattern1);

  if (deathMatch1) {
    const day = parseInt(deathMatch1[1]);
    const month = getMonthNumber(deathMatch1[2]);
    const year = parseInt(deathMatch1[3]);
    if (!isValidCompleteDate(year, month, day)) return null;
    return {
      title: `Death of ${personName}`,
      date: new Date(year, month, day),
      year,
      month,
      day,
      wikipediaUrl: '',
      description: text,
    };
  }

  // Pattern: "died April 23, 1616"
  const deathPattern2 =
    /\b(?:died|death)\s+(?:on\s+)?(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{3,4})\b/i;
  const deathMatch2 = text.match(deathPattern2);

  if (deathMatch2) {
    const month = getMonthNumber(deathMatch2[1]);
    const day = parseInt(deathMatch2[2]);
    const year = parseInt(deathMatch2[3]);
    if (!isValidCompleteDate(year, month, day)) return null;
    return {
      title: `Death of ${personName}`,
      date: new Date(year, month, day),
      year,
      month,
      day,
      wikipediaUrl: '',
      description: text,
    };
  }

  // No complete date found
  return null;
}

/**
 * Check if a Wikipedia page is about a historical event (not a person, place, or ongoing concept)
 */
function isHistoricalEvent(text: string, categories?: any[]): boolean {
  if (!text) return false;

  const lowerText = text.toLowerCase();
  
  // FIRST: Explicitly exclude time period pages and general overviews
  const timePeriodsAndOverviews = [
    /\bis a (decade|century|millennium|era|period|age)\b/i,
    /\bthis article is about the (decade|century|year)\b/i,
    /\bfollowing (decades?|centuries|years?) (are|were)\b/i,
    /\byears? in the \d+(st|nd|rd|th) century\b/i,
    /\bevents in the year \d{4}\b/i,
  ];

  for (const pattern of timePeriodsAndOverviews) {
    if (pattern.test(lowerText)) {
      return false;
    }
  }
  
  // Exclude non-events: geographic locations, abstract concepts, products, technology, vehicles
  // Biographical pages are handled separately by extractBiographicalDate
  // We ALLOW cultural releases (books, films, albums) as valid events
  const excludePatterns = [
    /\bis a (country|city|town|village|state|province|region|continent)\b/i,
    /\bis a (language|religion|ideology|philosophy|theory)\b/i,
    // Products and vehicles
    /\bis a (turboprop|engine|aircraft|airplane|helicopter|ship|boat|vessel|vehicle|car|automobile|tank|submarine)\b/i,
    /\bis (a|an) (family|series|line) of (aircraft|engines?|vehicles?|products?)\b/i,
    /\b(developed|manufactured|produced) by\b/i,
    // Technology and products
    /\bis a (software|hardware|device|product|brand|model|prototype)\b/i,
    /\bis a (computer|processor|chip|component)\b/i,
    // Lists and meta pages
    /\bis a list of\b/i,
    /\blist of\b/i,
    /\btimeline of\b/i,
    /\bcategory:/i,
  ];

  for (const pattern of excludePatterns) {
    if (pattern.test(lowerText)) {
      return false;
    }
  }

  // Check categories if available - only exclude geographic
  if (categories && categories.length > 0) {
    const catTitles = categories.map((cat: any) => cat.title.toLowerCase());
    const excludeCategories = [
      'countries',
      'cities',
    ];
    
    for (const excludeCat of excludeCategories) {
      if (catTitles.some((cat: string) => cat.includes(excludeCat))) {
        return false;
      }
    }
  }

  // Look for event indicators (including cultural releases)
  const eventPatterns = [
    // Traditional historical events
    /\b(battle|war|conflict|siege|invasion|conquest)\b/i,
    /\b(treaty|agreement|pact|accord|convention)\b/i,
    /\b(revolution|uprising|rebellion|revolt)\b/i,
    /\b(assassination|murder|execution)\b/i,
    /\b(disaster|earthquake|flood|fire|explosion)\b/i,
    /\b(discovery|invention|founded|established)\b/i,
    /\b(occurred|took place|happened)\b/i,
    /\bwas a (military|major|significant|historical) (event|operation|campaign)\b/i,
    /\b(coronation|abdication|election)\b/i,
    /\b(declaration|proclamation|announcement)\b/i,
    // Cultural releases
    /\b(released|published|premiered|launched)\b/i,
    /\bis a (\d{4}) (book|novel|film|movie|album|video game)\b/i,
    /\bwas released (in|on)\b/i,
    /\bwas published (in|on)\b/i,
  ];

  for (const pattern of eventPatterns) {
    if (pattern.test(lowerText)) {
      return true;
    }
  }

  // Require explicit event indicators - be strict about what qualifies
  return false;
}

/**
 * Extract date information from Wikipedia text
 * Requires complete date with day, month, and year
 * For date ranges, returns start date with "Start of" prefix
 */
function extractDateFromText(text: string): {
  date: Date;
  year: number;
  month: number;
  day: number;
  titlePrefix?: string;
} | null {
  if (!text) return null;

  // Date Range Patterns - Handle these first
  // Pattern: "Month Day1-Day2, Year" e.g., "January 5-8, 1942" or "January 5–8, 1942"
  const monthRangePattern =
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s*[-–]\s*(\d{1,2}),?\s+(\d{3,4})\b/i;
  const monthRangeMatch = text.match(monthRangePattern);

  if (monthRangeMatch) {
    const month = getMonthNumber(monthRangeMatch[1]);
    const startDay = parseInt(monthRangeMatch[2]);
    const year = parseInt(monthRangeMatch[4]);
    if (!isValidCompleteDate(year, month, startDay)) return null;
    return {
      date: new Date(year, month, startDay),
      year,
      month,
      day: startDay,
      titlePrefix: 'Start of',
    };
  }

  // Pattern: "Day1-Day2 Month Year" e.g., "5-8 January 1942" or "5–8 January 1942"
  const dayRangePattern =
    /\b(\d{1,2})\s*[-–]\s*(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{3,4})\b/i;
  const dayRangeMatch = text.match(dayRangePattern);

  if (dayRangeMatch) {
    const startDay = parseInt(dayRangeMatch[1]);
    const month = getMonthNumber(dayRangeMatch[3]);
    const year = parseInt(dayRangeMatch[4]);
    if (!isValidCompleteDate(year, month, startDay)) return null;
    return {
      date: new Date(year, month, startDay),
      year,
      month,
      day: startDay,
      titlePrefix: 'Start of',
    };
  }

  // Pattern: "Month1 Day1 to/- Month2 Day2, Year" e.g., "January 5 to February 8, 1942"
  const crossMonthRangePattern =
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s+(?:to|[-–])\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{3,4})\b/i;
  const crossMonthMatch = text.match(crossMonthRangePattern);

  if (crossMonthMatch) {
    const startMonth = getMonthNumber(crossMonthMatch[1]);
    const startDay = parseInt(crossMonthMatch[2]);
    const year = parseInt(crossMonthMatch[5]);
    if (!isValidCompleteDate(year, startMonth, startDay)) return null;
    return {
      date: new Date(year, startMonth, startDay),
      year,
      month: startMonth,
      day: startDay,
      titlePrefix: 'Start of',
    };
  }

  // Pattern: Release/publication with date range
  // e.g., "was released from January 5-8, 1942", "published on 5-8 January 1942"
  const releaseDateRangePattern1 =
    /\b(released|published|premiered|launched).*?\b(?:from|on)\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s*[-–]\s*(\d{1,2}),?\s+(\d{4})\b/i;
  const releaseRangeMatch1 = text.match(releaseDateRangePattern1);

  if (releaseRangeMatch1) {
    const month = getMonthNumber(releaseRangeMatch1[2]);
    const startDay = parseInt(releaseRangeMatch1[3]);
    const year = parseInt(releaseRangeMatch1[5]);
    if (!isValidCompleteDate(year, month, startDay)) return null;
    return {
      date: new Date(year, month, startDay),
      year,
      month,
      day: startDay,
      titlePrefix: 'Start of',
    };
  }

  const releaseDateRangePattern2 =
    /\b(released|published|premiered|launched).*?\b(?:from|on)\s+(\d{1,2})\s*[-–]\s*(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i;
  const releaseRangeMatch2 = text.match(releaseDateRangePattern2);

  if (releaseRangeMatch2) {
    const startDay = parseInt(releaseRangeMatch2[2]);
    const month = getMonthNumber(releaseRangeMatch2[4]);
    const year = parseInt(releaseRangeMatch2[5]);
    if (!isValidCompleteDate(year, month, startDay)) return null;
    return {
      date: new Date(year, month, startDay),
      year,
      month,
      day: startDay,
      titlePrefix: 'Start of',
    };
  }

  // Pattern 1: Look for release/publication dates with complete date
  // e.g., "was released on January 15, 1942", "published on May 3, 2001"
  const releaseDatePattern =
    /\b(released|published|premiered|launched).*?\b(in|on)\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/i;
  const releaseMatch = text.match(releaseDatePattern);

  if (releaseMatch) {
    const month = getMonthNumber(releaseMatch[3]);
    const day = parseInt(releaseMatch[4]);
    const year = parseInt(releaseMatch[5]);
    if (!isValidCompleteDate(year, month, day)) return null;
    return {
      date: new Date(year, month, day),
      year,
      month,
      day,
    };
  }

  // Pattern 2: "Month Day, Year" e.g., "January 15, 1942"
  const pattern1 =
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{3,4})\b/i;
  const match1 = text.match(pattern1);

  if (match1) {
    const month = getMonthNumber(match1[1]);
    const day = parseInt(match1[2]);
    const year = parseInt(match1[3]);
    if (!isValidCompleteDate(year, month, day)) return null;
    return {
      date: new Date(year, month, day),
      year,
      month,
      day,
    };
  }

  // Pattern 3: "Day Month Year" e.g., "15 January 1942"
  const pattern2 =
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{3,4})\b/i;
  const match2 = text.match(pattern2);

  if (match2) {
    const day = parseInt(match2[1]);
    const month = getMonthNumber(match2[2]);
    const year = parseInt(match2[3]);
    if (!isValidCompleteDate(year, month, day)) return null;
    return {
      date: new Date(year, month, day),
      year,
      month,
      day,
    };
  }

  // FALLBACK: Year range for wars/long events (e.g., "1873–1904", "1939-1945")
  // Use January 1 of the start year
  const yearRangePattern = /\b(\d{4})\s*[-–]\s*(\d{4})\b/;
  const yearRangeMatch = text.match(yearRangePattern);

  if (yearRangeMatch) {
    const startYear = parseInt(yearRangeMatch[1]);
    if (startYear >= 1 && startYear <= 2100) {
      return {
        date: new Date(startYear, 0, 1), // January 1
        year: startYear,
        month: 0, // January
        day: 1,
        titlePrefix: 'Start of',
      };
    }
  }

  // FALLBACK: Single year in context of conflict/war (e.g., "began in 1873")
  const yearContextPattern = /\b(began|started|commenced|fought|took place|occurred).*?(\d{4})\b/i;
  const yearContextMatch = text.match(yearContextPattern);

  if (yearContextMatch) {
    const year = parseInt(yearContextMatch[2]);
    if (year >= 1 && year <= 2100) {
      return {
        date: new Date(year, 0, 1), // January 1
        year,
        month: 0, // January
        day: 1,
      };
    }
  }

  // No complete date found
  return null;
}

function getMonthNumber(monthName: string): number {
  const months: { [key: string]: number } = {
    january: 0,
    february: 1,
    march: 2,
    april: 3,
    may: 4,
    june: 5,
    july: 6,
    august: 7,
    september: 8,
    october: 9,
    november: 10,
    december: 11,
  };
  return months[monthName.toLowerCase()] || 0;
}

/**
 * Validate that we have a complete and valid date
 */
function isValidCompleteDate(year: number, month: number, day: number): boolean {
  // Year must be reasonable
  if (year < 1 || year > 2100) return false;
  
  // Month must be 0-11 (JavaScript date months)
  if (month < 0 || month > 11) return false;
  
  // Day must be 1-31
  if (day < 1 || day > 31) return false;
  
  // Additional check: day must be valid for the given month/year
  const testDate = new Date(year, month, day);
  if (testDate.getMonth() !== month || testDate.getDate() !== day) {
    return false; // Invalid date like February 31
  }
  
  return true;
}

/**
 * Validate if an event exists in Wikipedia and extract its date
 */
export async function validateEvent(
  eventName: string
): Promise<HistoricalEvent | null> {
  // First search for the event - search more results for user submissions
  const results = await searchWikipediaEvents(eventName, 10);
  
  if (results.length === 0) {
    return null;
  }

  // Try to get details for each result
  for (const result of results) {
    // Skip time period pages and meta content
    if (isTimePeriodOrMetaPage(result.title)) {
      continue;
    }
    
    const details = await getEventDetails(result.title);
    if (details) {
      return details;
    }
  }

  return null;
}

/**
 * Fetch a starting event from a specific century
 * Searches for notable events from that era and returns a random one
 */
export async function fetchStartingEvent(
  century: number
): Promise<HistoricalEvent | null> {
  // Convert century to year range (e.g., 12th century = 1100-1199, 21st century = 2000-2099)
  const startYear = (century - 1) * 100;
  const midYear = startYear + 50;
  const endYear = startYear + 99;
  
  // Try various search strategies focused on actual historical events
  const searchTerms = [
    `${century}th century battle`,
    `${century}th century war`,
    `${startYear} treaty`,
    `${startYear} historical event`,
    `${midYear} battle`,
    `${century}th century revolution`,
    `${startYear}s war`,
    `${startYear}s battle`,
    `${century}th century disaster`,
    `${startYear} revolution`,
    `${midYear} treaty`,
    `${endYear} battle`,
    `${century}th century conflict`,
    `${startYear} war`,
    `${midYear} historical event`,
  ];

  // Collect valid events from multiple searches
  const validEvents: HistoricalEvent[] = [];
  const maxEventsToCollect = 10; // Collect up to 10 valid events

  for (const searchTerm of searchTerms) {
    if (validEvents.length >= maxEventsToCollect) break;
    
    const results = await searchWikipediaEvents(searchTerm, 15);
    
    for (const result of results) {
      if (validEvents.length >= maxEventsToCollect) break;
      
      // Skip time period pages and meta content
      if (isTimePeriodOrMetaPage(result.title)) {
        continue;
      }
      
      const details = await getEventDetails(result.title);
      if (details && details.year >= startYear && details.year <= endYear) {
        // Check if we already have this event (avoid duplicates)
        const isDuplicate = validEvents.some(e => e.title === details.title);
        if (!isDuplicate) {
          validEvents.push(details);
        }
      }
    }
  }

  // Return a random event from the collected events
  if (validEvents.length > 0) {
    const randomIndex = Math.floor(Math.random() * validEvents.length);
    return validEvents[randomIndex];
  }

  // If absolutely no event found after all attempts, return null
  // The game will show an error and user can try again
  return null;
}

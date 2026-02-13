import type { GameState, GameEvent, HistoricalEvent, BufferRule } from '../types/game';

/**
 * Calculate the buffer (in years) based on the current year and buffer rules
 */
export function calculateBuffer(year: number, rules: BufferRule[]): number {
  for (const rule of rules) {
    if (year >= rule.fromYear && year <= rule.toYear) {
      return rule.bufferYears;
    }
  }
  // Default to 1 year if no rule matches
  return 1;
}

/**
 * Check if an event is within the valid buffer from the anchor event
 */
export function isEventWithinBuffer(
  anchorEvent: HistoricalEvent,
  newEvent: HistoricalEvent,
  bufferYears: number
): { isValid: boolean; yearDifference: number } {
  const yearDifference = newEvent.year - anchorEvent.year;

  // Events must be chronological (newer than anchor)
  if (yearDifference < 0) {
    return { isValid: false, yearDifference };
  }

  // Check if within buffer
  const isValid = yearDifference <= bufferYears;

  return { isValid, yearDifference };
}

/**
 * Get the anchor event (the last checked event or the starting point)
 */
export function getAnchorEvent(gameState: GameState): GameEvent | null {
  if (gameState.eventChain.length === 0) {
    return null;
  }

  // Get the last checked event, or the most recent event if none have been checked
  return gameState.eventChain[gameState.lastCheckedEventIndex] || null;
}

/**
 * Get the current year the game is at (for determining buffer)
 */
export function getCurrentYear(gameState: GameState): number {
  const anchorEvent = getAnchorEvent(gameState);
  if (anchorEvent) {
    return anchorEvent.event.year;
  }

  // If no events yet, use the starting century
  return gameState.settings.startingCentury * 100;
}

/**
 * Process a bullshit call and determine the outcome
 */
export function processBullshitCall(
  gameState: GameState,
  callingPlayerId: string
): {
  success: boolean;
  eliminatedPlayerId: string;
  wasEventCorrect: boolean;
  details: string;
} {
  if (gameState.eventChain.length === 0) {
    return {
      success: false,
      eliminatedPlayerId: '',
      wasEventCorrect: true,
      details: 'No events to check',
    };
  }

  const lastEvent = gameState.eventChain[gameState.eventChain.length - 1];
  const anchorEvent = getAnchorEvent(gameState);

  if (!anchorEvent) {
    // First event can't be wrong
    return {
      success: false,
      eliminatedPlayerId: callingPlayerId,
      wasEventCorrect: true,
      details: 'Cannot call BS on the first event',
    };
  }

  // Check if the last event was within the buffer
  const buffer = calculateBuffer(anchorEvent.event.year, gameState.settings.bufferRules);
  const { isValid, yearDifference } = isEventWithinBuffer(
    anchorEvent.event,
    lastEvent.event,
    buffer
  );

  if (isValid) {
    // Event was correct, caller is eliminated
    return {
      success: false,
      eliminatedPlayerId: callingPlayerId,
      wasEventCorrect: true,
      details: `Event was correct! Year difference: ${yearDifference}, Buffer: ${buffer}`,
    };
  } else {
    // Event was incorrect, event submitter is eliminated
    return {
      success: true,
      eliminatedPlayerId: lastEvent.playerId,
      wasEventCorrect: false,
      details: `Event was incorrect! Year difference: ${yearDifference}, Buffer: ${buffer}`,
    };
  }
}

/**
 * Get the next player who should play
 */
export function getNextPlayer(gameState: GameState): string | null {
  const alivePlayers = gameState.players.filter((p) => p.isAlive);

  if (alivePlayers.length <= 1) {
    return null; // Game over
  }

  // Find the next alive player
  let nextIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
  let attempts = 0;

  while (!gameState.players[nextIndex].isAlive && attempts < gameState.players.length) {
    nextIndex = (nextIndex + 1) % gameState.players.length;
    attempts++;
  }

  return gameState.players[nextIndex]?.id || null;
}

/**
 * Check if the game is over
 */
export function isGameOver(gameState: GameState): boolean {
  const alivePlayers = gameState.players.filter((p) => p.isAlive);
  return alivePlayers.length <= 1;
}

/**
 * Get the winner of the game
 */
export function getWinner(gameState: GameState): string | null {
  const alivePlayers = gameState.players.filter((p) => p.isAlive);
  return alivePlayers.length === 1 ? alivePlayers[0].id : null;
}

/**
 * Calculate time difference in years, months, and days
 */
export function calculateTimeDifference(
  date1: Date,
  date2: Date
): { years: number; months: number; days: number } {
  const d1 = new Date(date1);
  const d2 = new Date(date2);

  let years = d2.getFullYear() - d1.getFullYear();
  let months = d2.getMonth() - d1.getMonth();
  let days = d2.getDate() - d1.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(d2.getFullYear(), d2.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  return { years, months, days };
}

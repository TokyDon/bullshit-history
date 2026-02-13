export type GamePhase = 'lobby' | 'playing' | 'results';

export interface Player {
  id: string;
  name: string;
  isAlive: boolean;
  isHost?: boolean;
}

export interface HistoricalEvent {
  title: string;
  date: Date;
  year: number;
  month: number;
  day: number;
  wikipediaUrl?: string;
  description?: string;
}

export interface GameEvent {
  playerId: string;
  playerName: string;
  event: HistoricalEvent;
  wasChecked: boolean;
  wasCorrect?: boolean;
  timestamp: number;
}

export interface BufferRule {
  fromYear: number;
  toYear: number;
  bufferYears: number;
}

export interface GameSettings {
  startingCentury: number; // e.g., 12 for 12th century (1100s)
  bufferRules: BufferRule[];
  maxPlayers: number;
  requireDayPrecision: boolean;
}

export interface GameState {
  gameId: string;
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  eventChain: GameEvent[];
  settings: GameSettings;
  currentBuffer: number;
  lastCheckedEventIndex: number;
}

export const DEFAULT_BUFFER_RULES: BufferRule[] = [
  { fromYear: 0, toYear: 999, bufferYears: 50 },
  { fromYear: 1000, toYear: 1499, bufferYears: 25 },
  { fromYear: 1500, toYear: 1799, bufferYears: 10 },
  { fromYear: 1800, toYear: 1899, bufferYears: 5 },
  { fromYear: 1900, toYear: 1949, bufferYears: 3 },
  { fromYear: 1950, toYear: 1999, bufferYears: 2 },
  { fromYear: 2000, toYear: 9999, bufferYears: 1 },
];

export const DEFAULT_SETTINGS: GameSettings = {
  startingCentury: 12,
  bufferRules: DEFAULT_BUFFER_RULES,
  maxPlayers: 8,
  requireDayPrecision: false,
};

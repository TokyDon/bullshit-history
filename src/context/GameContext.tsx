import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { GameState, Player, GameEvent, HistoricalEvent } from '../types/game';
import { DEFAULT_SETTINGS } from '../types/game';
import { fetchStartingEvent } from '../services/wikipedia';
import {
  calculateBuffer,
  processBullshitCall,
  isGameOver,
} from '../utils/gameLogic';

interface GameContextType {
  gameState: GameState | null;
  createGame: (hostName: string, gameId?: string) => void;
  joinGame: (gameId: string, playerName: string) => void;
  setPlayers: (players: Player[]) => void;
  startGame: (players?: Player[]) => Promise<void>;
  submitEvent: (event: HistoricalEvent) => Promise<{ success: boolean; message: string }>;
  callBullshit: (playerId: string) => void;
  updateSettings: (settings: Partial<GameState['settings']>) => void;
  resetGame: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
}

interface GameProviderProps {
  children: ReactNode;
}

export function GameProvider({ children }: GameProviderProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);

  const createGame = (hostName: string, gameId?: string) => {
    const newGameId = gameId || generateGameId();
    const hostPlayer: Player = {
      id: generatePlayerId(),
      name: hostName,
      isAlive: true,
      isHost: true,
    };

    setGameState({
      gameId: newGameId,
      phase: 'lobby',
      players: [hostPlayer],
      currentPlayerIndex: 0,
      eventChain: [],
      settings: DEFAULT_SETTINGS,
      currentBuffer: calculateBuffer(
        (DEFAULT_SETTINGS.startingCentury - 1) * 100,
        DEFAULT_SETTINGS.bufferRules
      ),
      lastCheckedEventIndex: -1,
    });
  };

  const joinGame = (_gameId: string, playerName: string) => {
    // In a real implementation, this would connect to a server
    // For now, we'll just add a local player
    if (!gameState) return;

    const newPlayer: Player = {
      id: generatePlayerId(),
      name: playerName,
      isAlive: true,
    };

    setGameState({
      ...gameState,
      players: [...gameState.players, newPlayer],
    });
  };

  const setPlayers = (players: Player[]) => {
    if (!gameState) return;

    setGameState({
      ...gameState,
      players,
    });
  };

  const startGame = async (players?: Player[]) => {
    if (!gameState) return;
    
    // Use provided players or current gameState players
    const gamePlayers = players || gameState.players;
    
    if (gamePlayers.length < 2) {
      alert('Need at least 2 players to start!');
      return;
    }

    // Update state with players if provided
    const updatedGameState = players ? { ...gameState, players } : gameState;

    // Fetch a starting event from the chosen century
    const startingEvent = await fetchStartingEvent(updatedGameState.settings.startingCentury);

    if (!startingEvent) {
      alert('Failed to fetch starting event. Please try again.');
      return;
    }

    // Create the initial game event (marked as checked and correct)
    const initialGameEvent: GameEvent = {
      playerId: 'system',
      playerName: 'Game',
      event: startingEvent,
      wasChecked: true,
      wasCorrect: true,
      timestamp: Date.now(),
    };

    // Calculate buffer based on the starting event's year
    const initialBuffer = calculateBuffer(
      startingEvent.year,
      updatedGameState.settings.bufferRules
    );

    setGameState({
      ...updatedGameState,
      phase: 'playing',
      eventChain: [initialGameEvent],
      lastCheckedEventIndex: 0,
      currentBuffer: initialBuffer,
    });
  };

  const submitEvent = async (event: HistoricalEvent): Promise<{ success: boolean; message: string }> => {
    if (!gameState) {
      return { success: false, message: 'No active game' };
    }

    // Use the already-validated event (no need to validate again)
    const validatedEvent = event;

    // Check if this event has already been submitted
    const isDuplicate = gameState.eventChain.some(
      (gameEvent) => gameEvent.event.title.toLowerCase() === validatedEvent.title.toLowerCase()
    );

    if (isDuplicate) {
      return {
        success: false,
        message: 'This event has already been submitted! Try a different one.',
      };
    }

    // Allow any year - other players can call BS if it's wrong
    // No year validation needed here

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    const newGameEvent: GameEvent = {
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      event: validatedEvent,
      wasChecked: false,
      timestamp: Date.now(),
    };

    // Update the game state
    const newEventChain = [...gameState.eventChain, newGameEvent];

    // If this is the first event, it becomes the anchor
    const newLastCheckedIndex =
      gameState.lastCheckedEventIndex === -1 ? 0 : gameState.lastCheckedEventIndex;

    // Calculate new buffer based on the event year
    const newBuffer = calculateBuffer(validatedEvent.year, gameState.settings.bufferRules);

    // Move to next player
    const nextPlayerIndex = getNextPlayerIndex(gameState);

    setGameState({
      ...gameState,
      eventChain: newEventChain,
      currentPlayerIndex: nextPlayerIndex,
      currentBuffer: newBuffer,
      lastCheckedEventIndex: newLastCheckedIndex,
    });

    return { success: true, message: 'Event submitted!' };
  };

  const callBullshit = (playerId: string) => {
    if (!gameState) return;

    const result = processBullshitCall(gameState, playerId);

    // Mark the last event as checked
    const updatedEventChain = [...gameState.eventChain];
    if (updatedEventChain.length > 0) {
      updatedEventChain[updatedEventChain.length - 1] = {
        ...updatedEventChain[updatedEventChain.length - 1],
        wasChecked: true,
        wasCorrect: result.wasEventCorrect,
      };
    }

    // Eliminate the player
    const updatedPlayers = gameState.players.map((p) =>
      p.id === result.eliminatedPlayerId ? { ...p, isAlive: false } : p
    );

    // Update last checked event index
    // If event was incorrect, continue from the event BEFORE the challenged one
    const newLastCheckedIndex = result.wasEventCorrect 
      ? updatedEventChain.length - 1
      : Math.max(0, updatedEventChain.length - 2);

    // Check if game is over
    const gameOver = isGameOver({ ...gameState, players: updatedPlayers });

    setGameState({
      ...gameState,
      players: updatedPlayers,
      eventChain: updatedEventChain,
      lastCheckedEventIndex: newLastCheckedIndex,
      phase: gameOver ? 'results' : 'playing',
      currentBuffer: calculateBuffer(
        updatedEventChain[newLastCheckedIndex].event.year,
        gameState.settings.bufferRules
      ),
    });

    alert(result.details);
  };

  const updateSettings = (settings: Partial<GameState['settings']>) => {
    if (!gameState) return;
    setGameState({
      ...gameState,
      settings: { ...gameState.settings, ...settings },
    });
  };

  const resetGame = () => {
    setGameState(null);
  };

  return (
    <GameContext.Provider
      value={{
        gameState,
        createGame,
        joinGame,
        setPlayers,
        startGame,
        submitEvent,
        callBullshit,
        updateSettings,
        resetGame,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

function generateGameId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generatePlayerId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function getNextPlayerIndex(gameState: GameState): number {
  let nextIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
  let attempts = 0;

  while (!gameState.players[nextIndex].isAlive && attempts < gameState.players.length) {
    nextIndex = (nextIndex + 1) % gameState.players.length;
    attempts++;
  }

  return nextIndex;
}

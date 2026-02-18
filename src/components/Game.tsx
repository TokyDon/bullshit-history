import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { validateEventWithOptions } from '../services/wikipedia';
import type { HistoricalEvent } from '../types/game';
import './Game.css';

// Helper function to format event date as "Month Day, Year"
function formatEventDate(event: HistoricalEvent): string {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const monthName = monthNames[event.month];
  return `${monthName} ${event.day}, ${event.year}`;
}

export function Game() {
  const { gameState, submitEvent, callBullshit, resetGame } = useGame();
  const [eventInput, setEventInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingEvents, setPendingEvents] = useState<HistoricalEvent[]>([]);
  const [showBullshitDialog, setShowBullshitDialog] = useState(false);

  if (!gameState) return null;

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isCurrentPlayer = currentPlayer?.isAlive;
  const lastEvent = gameState.eventChain[gameState.eventChain.length - 1];
  const alivePlayers = gameState.players.filter((p) => p.isAlive);

  const handleSubmitEvent = async () => {
    if (!eventInput.trim() || isSubmitting) return;

    setIsSubmitting(true);
    
    const input = eventInput.trim();
    
    // Check if input is just a year (e.g., "1066", "250 BC", "1066 AD")
    const yearOnlyPattern = /^\d+\s*(BC|AD|BCE|CE)?$/i;
    if (yearOnlyPattern.test(input)) {
      setIsSubmitting(false);
      alert('Please enter a historical event, not just a year. Try "Battle of Hastings" instead of "1066".');
      return;
    }
    
    // Get up to 3 event options
    const eventOptions = await validateEventWithOptions(input);
    
    if (eventOptions.length === 0) {
      setIsSubmitting(false);
      alert('Event not found in Wikipedia. Try being more specific!');
      return;
    }

    // Show confirmation dialog with options
    setPendingEvents(eventOptions);
    setIsSubmitting(false);
  };

  const handleConfirmEvent = async (selectedEvent: HistoricalEvent) => {
    setIsSubmitting(true);
    const result = await submitEvent(selectedEvent);
    setIsSubmitting(false);

    if (result.success) {
      setEventInput('');
      setPendingEvents([]);
    } else {
      alert(result.message);
      setPendingEvents([]);
    }
  };

  const handleCancelEvent = () => {
    setPendingEvents([]);
    // Keep the input so they can try again
  };

  const handleBullshitClick = () => {
    setShowBullshitDialog(true);
  };

  const handleBullshitConfirm = (playerId: string) => {
    callBullshit(playerId);
    setShowBullshitDialog(false);
  };

  const handleBullshitCancel = () => {
    setShowBullshitDialog(false);
  };

  // Get players who can call bullshit (alive and not the last event submitter)
  const eligibleBullshitCallers = lastEvent
    ? gameState.players.filter((p) => p.isAlive && p.id !== lastEvent.playerId)
    : [];

  const handleExitGame = () => {
    if (confirm('Are you sure you want to exit the game? All progress will be lost.')) {
      resetGame();
    }
  };

  const canCallBullshit = lastEvent && !lastEvent.wasChecked && gameState.eventChain.length > 1;

  return (
    <>
      <div className="game-header" key="game-nav-header">
        <button onClick={handleExitGame} className="btn-back" title="Exit Game">
          <span className="material-icons">chevron_left</span>
        </button>
        <div className="game-header-text">{gameState.gameId} · {alivePlayers.length} {alivePlayers.length === 1 ? 'Player' : 'Players'}</div>
      </div>
      
      <div className="game">

      {pendingEvents.length > 0 && (
        <div className="confirmation-overlay">
          <div className="confirmation-dialog">
            <h3>Which event did you mean?</h3>
            <p className="confirmation-hint">Select the closest match:</p>
            <div className="confirmation-options">
              {pendingEvents.map((event, index) => (
                <button
                  key={index}
                  onClick={() => handleConfirmEvent(event)}
                  className="event-option"
                  disabled={isSubmitting}
                >
                  <div className="event-option-rank">{index + 1}</div>
                  <div className="event-option-content">
                    <p className="event-option-title">{event.title}</p>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={handleCancelEvent}
              className="btn btn-secondary"
              style={{ marginTop: '1rem' }}
            >
              ✗ None of these - Try Again
            </button>
          </div>
        </div>
      )}

      <div className="game-content">
        <div className="current-turn">
          <h2>
            {currentPlayer?.name}'s Turn
          </h2>
          {lastEvent && (
            <div className="last-event">
              <p className="label">
                {gameState.eventChain.length === 1 ? 'Starting Event:' : 'Last Event:'}
              </p>
              <p className="event-title">{lastEvent.event.title}</p>
              {lastEvent.wasChecked ? (
                <p className="event-year">{formatEventDate(lastEvent.event)}</p>
              ) : (
                <p className="event-year-hidden">📅 Date hidden until challenged</p>
              )}
              <div className="buffer-info">Buffer: +{gameState.currentBuffer} years</div>
            </div>
          )}
        </div>

        {isCurrentPlayer && (
          <div className="event-input-container">
            <p className="input-hint">💡 Type a historical event (e.g., "Battle of Hastings", "Moon Landing")</p>
            <input
              type="text"
              placeholder="Enter a historical event..."
              value={eventInput}
              onChange={(e) => setEventInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmitEvent()}
              className="event-input"
              disabled={isSubmitting}
            />
            <button
              onClick={handleSubmitEvent}
              className="btn btn-primary"
              disabled={!eventInput.trim() || isSubmitting}
            >
              {isSubmitting ? 'Searching...' : 'Search Event'}
            </button>
          </div>
        )}

        {canCallBullshit && (
          <div className="bullshit-section">
            <button onClick={handleBullshitClick} className="btn btn-bullshit">
              🚨 Call Bullsh*t! 🚨
            </button>
            <p className="warning-text">
              Only call if you think the last event was outside the buffer!
            </p>
          </div>
        )}

        {showBullshitDialog && (
          <div className="confirmation-overlay">
            <div className="confirmation-dialog">
              <h3>Who is calling Bullsh*t?</h3>
              <div className="player-selection">
                {eligibleBullshitCallers.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => handleBullshitConfirm(player.id)}
                    className="player-select-btn"
                  >
                    {player.name}
                  </button>
                ))}
              </div>
              <button onClick={handleBullshitCancel} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="event-chain">
          <h3>Event Timeline</h3>
          <p className="timeline-hint">💡 Dates are hidden until someone calls Bullsh*t!</p>
          <div className="events-list">
            {[...gameState.eventChain].reverse().map((event, reverseIndex) => {
              const index = gameState.eventChain.length - 1 - reverseIndex;
              return (
              <div
                key={index}
                className={`event-card ${event.wasChecked ? (event.wasCorrect ? 'correct' : 'incorrect') : ''}`}
              >
                <div className="event-card-header">
                  <span className="event-player">{event.playerName}</span>
                  {event.wasChecked && (
                    <span className="event-date">{formatEventDate(event.event)}</span>
                  )}
                </div>
                <p className="event-card-title">{event.event.title}</p>
                {event.wasChecked && (
                  <div className="event-status">
                    {event.wasCorrect ? '✓ Correct' : '✗ Incorrect'}
                  </div>
                )}
              </div>
            );
            })}
          </div>
        </div>

        <div className="players-status">
          <h3>Players</h3>
          <div className="players-grid">
            {gameState.players.map((player) => (
              <div
                key={player.id}
                className={`player-card ${player.isAlive ? 'alive' : 'eliminated'} ${
                  player.id === currentPlayer?.id ? 'current' : ''
                }`}
              >
                <span className="player-name">{player.name}</span>
                {!player.isAlive && <span className="eliminated-badge">OUT</span>}
                {player.id === currentPlayer?.id && player.isAlive && (
                  <span className="current-badge">→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

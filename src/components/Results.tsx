
import { useGame } from '../context/GameContext';
import type { HistoricalEvent } from '../types/game';
import './Results.css';

// Helper function to format event date as "Month Day, Year"
function formatEventDate(event: HistoricalEvent): string {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const monthName = monthNames[event.month];
  return `${monthName} ${event.day}, ${event.year}`;
}

export function Results() {
  const { gameState, resetGame } = useGame();

  if (!gameState) return null;

  const winner = gameState.players.find((p) => p.isAlive);
  const sortedEvents = [...gameState.eventChain];

  return (
    <div className="results">
      <div className="results-header">
        <h1>🏆 Game Over! 🏆</h1>
        {winner && (
          <div className="winner-announcement">
            <p className="winner-label">Winner:</p>
            <p className="winner-name">{winner.name}</p>
          </div>
        )}
      </div>

      <div className="results-content">
        <div className="event-timeline">
          <h2>Complete Event Timeline</h2>
          <p className="timeline-description">
            Here's the full chain of events - see how accurate everyone was!
          </p>

          <div className="timeline-list">
            {sortedEvents.map((event, index) => {
              const prevEvent = index > 0 ? sortedEvents[index - 1] : null;
              const yearDiff = prevEvent ? event.event.year - prevEvent.event.year : 0;

              return (
                <div key={index} className="timeline-item">
                  <div className="timeline-marker">{index + 1}</div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className="timeline-player">{event.playerName}</span>
                      <span className={`timeline-status ${event.wasChecked ? (event.wasCorrect ? 'correct' : 'incorrect') : 'unchecked'}`}>
                        {event.wasChecked ? (event.wasCorrect ? '✓ Correct' : '✗ Incorrect') : ''}
                      </span>
                    </div>
                    <h3 className="timeline-event-title">{event.event.title}</h3>
                    <div className="timeline-date">
                      <span className="full-date">{formatEventDate(event.event)}</span>
                    </div>
                    {prevEvent && (
                      <div className="year-difference">
                        <span>+{yearDiff} years from previous event</span>
                      </div>
                    )}
                    {event.event.wikipediaUrl && (
                      <a
                        href={event.event.wikipediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="wiki-link"
                      >
                        View on Wikipedia →
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="final-stats">
          <h2>Final Statistics</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{gameState.eventChain.length}</div>
              <div className="stat-label">Total Events</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {gameState.eventChain.filter((e) => e.wasChecked).length}
              </div>
              <div className="stat-label">Events Challenged</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{gameState.players.length}</div>
              <div className="stat-label">Total Players</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {sortedEvents.length > 0
                  ? sortedEvents[sortedEvents.length - 1].event.year -
                    sortedEvents[0].event.year
                  : 0}
              </div>
              <div className="stat-label">Years Covered</div>
            </div>
          </div>
        </div>

        <div className="player-rankings">
          <h2>Final Rankings</h2>
          <div className="rankings-list">
            {gameState.players
              .sort((a) => (a.isAlive ? -1 : 1))
              .map((player, index) => (
                <div key={player.id} className={`ranking-item ${player.isAlive ? 'winner' : ''}`}>
                  <span className="rank">#{index + 1}</span>
                  <span className="player-name">{player.name}</span>
                  <span className="status">
                    {player.isAlive ? '👑 Winner' : '💀 Eliminated'}
                  </span>
                </div>
              ))}
          </div>
        </div>

        <button onClick={resetGame} className="btn btn-primary btn-large">
          Play Again
        </button>
      </div>
    </div>
  );
}

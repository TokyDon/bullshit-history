import { useState } from 'react';
import { useGame } from '../context/GameContext';
import './Lobby.css';

export function Lobby() {
  const { gameState, createGame, startGame, updateSettings, resetGame } = useGame();
  const [gameCode, setGameCode] = useState('');
  const [showJoinGame, setShowJoinGame] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [playerFields, setPlayerFields] = useState(['', '']);

  const handleCreateGame = () => {
    createGame('temp-host');
  };

  const handleJoinGame = () => {
    // TODO: Implement when multiplayer server is ready
    alert('Online multiplayer coming soon!');
  };

  const handleStartGame = async () => {
    const filledPlayers = playerFields.filter(name => name.trim());
    
    if (filledPlayers.length < 2) {
      alert('Need at least 2 players to start!');
      return;
    }

    setIsStarting(true);
    try {
      // Create players from filled fields
      const players = filledPlayers.map((name, index) => ({
        id: `player-${Date.now()}-${index}`,
        name: name.trim(),
        isAlive: true,
        isHost: index === 0,
      }));
      
      // Pass players directly to startGame to avoid race condition
      await startGame(players);
    } catch (error) {
      setIsStarting(false);
      alert('Failed to start game. Please try again.');
    }
  };

  const handlePlayerFieldChange = (index: number, value: string) => {
    const newFields = [...playerFields];
    newFields[index] = value;
    setPlayerFields(newFields);
    
    // If user is typing in the last field and we haven't reached max players, add a new field
    if (index === playerFields.length - 1 && value.trim() && playerFields.length < 8) {
      setPlayerFields([...newFields, '']);
    }
  };

  const handleLeaveLobby = () => {
    if (confirm('Are you sure you want to leave the lobby? All players will be removed.')) {
      resetGame();
    }
  };

  if (!gameState) {
    return (
      <div className="lobby">
        <div className="lobby-header">
          <h1>Bulls**t History</h1>
          <p className="tagline">Can you tell fact from fiction?</p>
        </div>

        <div className="lobby-content">
          <div className="button-group">
            <button 
              onClick={handleCreateGame} 
              className="btn btn-primary btn-large"
            >
              Create New Game
            </button>
            <button onClick={() => setShowJoinGame(!showJoinGame)} className="btn btn-secondary">
              {showJoinGame ? 'Cancel' : 'Join Game'}
            </button>
          </div>

          {showJoinGame && (
            <div className="join-game-section">
              <h3>Join Existing Game</h3>
              <div className="join-game-form">
                <input
                  type="text"
                  placeholder="Enter game code"
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                  className="input"
                  maxLength={6}
                />
                <button
                  onClick={handleJoinGame}
                  className="btn btn-primary"
                  disabled={!gameCode.trim()}
                >
                  Join
                </button>
              </div>
              <p className="join-note">
                💡 Online multiplayer requires a server (coming soon!)
              </p>
            </div>
          )}

          <div className="how-to-play">
            <h3>How to Play</h3>
            <ol>
              <li>Create a game and add all players from this device</li>
              <li>Players take turns naming historical events in chronological order</li>
              <li>Each event must be within the time buffer from the previous event</li>
              <li>Call "Bullsh*t!" if you think the last player was wrong</li>
              <li>Wrong calls eliminate you - last player standing wins!</li>
            </ol>
            <p className="pass-play-note">
              📱 <strong>Pass & Play Mode:</strong> Add all players here before starting. 
              Online multiplayer coming soon!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby">
      <div className="lobby-header">
        <h1>Game Lobby</h1>
        <div className="game-code">
          <span>Game Code:</span>
          <strong>{gameState.gameId}</strong>
        </div>
      </div>

      <div className="lobby-content">
        <div className="add-player-section">
          <h3>Add Players (2-8)</h3>
          <p className="player-fields-hint">💡 Type in the last field to add more players</p>
          <div className="player-fields-list">
            {playerFields.map((field, index) => (
              <input
                key={index}
                type="text"
                placeholder={`Player ${index + 1} name`}
                value={field}
                onChange={(e) => handlePlayerFieldChange(index, e.target.value)}
                className="input"
                maxLength={20}
              />
            ))}
          </div>
        </div>

        <div className="settings-panel">
          <h3>Starting Century</h3>
          <div className="setting-item">
            <select
              value={gameState.settings.startingCentury}
              onChange={(e) => updateSettings({ startingCentury: parseInt(e.target.value) })}
              className="input"
            >
              {Array.from({ length: 21 }, (_, i) => i + 1).map((century) => {
                const startYear = (century - 1) * 100;
                return (
                  <option key={century} value={century}>
                    {century}th Century ({startYear}s)
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <button onClick={handleStartGame} className="btn btn-primary btn-large" disabled={isStarting || playerFields.filter(f => f.trim()).length < 2}>
          {isStarting ? (
            <>
              <span className="spinner"></span>
              Finding starting event...
            </>
          ) : (
            'Start Game'
          )}
        </button>
        
        <button onClick={handleLeaveLobby} className="btn btn-danger">
          Leave Lobby
        </button>
      </div>
    </div>
  );
}

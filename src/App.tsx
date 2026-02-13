import { useGame } from './context/GameContext';
import { Lobby } from './components/Lobby';
import { Game } from './components/Game';
import { Results } from './components/Results';
import './App.css';

function App() {
  const { gameState } = useGame();

  if (!gameState || gameState.phase === 'lobby') {
    return <Lobby />;
  }

  if (gameState.phase === 'playing') {
    return <Game />;
  }

  if (gameState.phase === 'results') {
    return <Results />;
  }

  return null;
}

export default App;

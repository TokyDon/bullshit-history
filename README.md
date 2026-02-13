# Bulls**t History 🎯📚

A mobile-first multiplayer party game where players compete by naming historical events in chronological order. Test your knowledge, call out mistakes, and be the last player standing!

## 🎮 Game Overview

Bulls**t History is an engaging party game that combines historical knowledge with bluffing and strategy. Players take turns naming historical events that must occur within a specific time buffer from the previous event. Think someone got it wrong? Call "Bullsh*t!" - but be careful, wrong calls eliminate you!

### Game Features

- **Multiplayer Support**: Play with 2-8 players (online multiplayer ready for server integration)
- **Pass-and-Play Mode**: Share your device with friends
- **Dynamic Time Buffers**: As you progress through history, the time windows get tighter
- **Wikipedia Integration**: Real historical events validated through Wikipedia's API
- **Mobile-First Design**: Optimized for smartphones and tablets
- **Real-time Validation**: Events are checked against Wikipedia for accuracy

## 🎲 How to Play

1. **Create or Join a Game**: Host creates a game and shares the game code with friends
2. **Set Starting Period**: Choose which century to start from (default: 12th century)
3. **Take Turns**: Each player names a historical event that happened within the time buffer
4. **Call Bullsh*t**: If you think the previous player was wrong, call them out!
5. **Win**: Be the last player standing to claim victory

### Time Buffers

The game uses dynamic time buffers that narrow as you progress through history:

- **0-999 AD**: ±50 years
- **1000-1499**: ±25 years
- **1500-1799**: ±10 years
- **1800-1899**: ±5 years
- **1900-1949**: ±3 years
- **1950-1999**: ±2 years
- **2000+**: ±1 year

*Note: Buffers can be customized in game settings*

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd bullshit-history

# Install dependencies
npm install

# Run development server
npm run dev
```

The app will be available at `http://localhost:5173/`

### Building for Production

```bash
npm run build
npm run preview
```

## 🏗️ Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **Styling**: CSS3 (Mobile-first responsive design)
- **API Integration**: Wikipedia API via Axios
- **State Management**: React Context API
- **Real-time**: Socket.io-client (ready for multiplayer server)

## 📁 Project Structure

```
src/
├── components/        # React components
│   ├── Lobby.tsx     # Game lobby & setup
│   ├── Game.tsx      # Main gameplay screen
│   └── Results.tsx   # Results & statistics
├── context/          # React Context for state management
│   └── GameContext.tsx
├── services/         # External API integrations
│   └── wikipedia.ts  # Wikipedia API service
├── types/            # TypeScript type definitions
│   └── game.ts
├── utils/            # Game logic utilities
│   └── gameLogic.ts
└── App.tsx           # Main app component
```

## 🔐 Security Considerations

### Current Implementation

- Input sanitization for user-provided event names
- CORS-enabled Wikipedia API requests (origin: *)
- Client-side validation of events

### For Production Deployment

1. **Environment Variables**: Use `.env` for API keys and configuration
2. **Rate Limiting**: Implement rate limiting for API requests
3. **Server-Side Validation**: Add backend validation for game moves
4. **Authentication**: Add user authentication for online play
5. **XSS Protection**: Sanitize all user inputs on display
6. **WebSocket Security**: Use secure WebSocket (wss://) with authentication

## 🔧 Configuration

### Game Settings

Hosts can customize:
- Starting century
- Max players
- Custom time buffers (coming soon)

### Wikipedia API

The game uses Wikipedia's free API:
- Endpoint: `https://en.wikipedia.org/w/api.php`
- No API key required
- Rate limits apply (be considerate!)

## 🌐 Multiplayer Setup (Future)

This app is ready for multiplayer server integration. To enable online multiplayer:

1. Set up a Node.js server with Socket.io
2. Implement game rooms and state synchronization
3. Add player authentication
4. Deploy server and update client configuration

Example server structure:
```javascript
// server.js (example)
const io = require('socket.io')(3001);
// Handle game events: createGame, joinGame, submitEvent, callBullshit
```

## 📱 Mobile Optimization

- Touch-optimized controls
- Viewport meta tags prevent zoom issues
- Responsive layouts for all screen sizes
- iOS-specific input handling (no auto-zoom)
- Smooth animations and transitions

## 🤝 Contributing

Contributions are welcome! Areas for improvement:

- Enhanced date extraction from Wikipedia
- Multiplayer server implementation
- Improved AI suggestions for event names
- Custom game modes
- Achievements and leaderboards

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Wikipedia for providing free access to historical event data
- All the history buffs who will enjoy (and fact-check) this game!

## 🐛 Known Issues

- Wikipedia date extraction is simplified - some events may not have precise dates
- Pass-and-play mode only (multiplayer server needed for online play)
- Limited historical coverage for very ancient events

## 📞 Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

**Have fun learning history! 🎉**

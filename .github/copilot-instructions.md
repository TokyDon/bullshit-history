# Bulls**t History - Copilot Instructions

This is a mobile-first multiplayer party game built with React, TypeScript, and Vite.

## Project Overview

- **Game Type**: Multiplayer history trivia party game
- **Tech Stack**: React 19, TypeScript, Vite 7, Socket.io-client
- **API**: Wikipedia API for historical event validation
- **State Management**: React Context API

## Key Features

- Mobile-optimized UI with responsive design
- Pass-and-play multiplayer (online multiplayer ready)
- Dynamic time buffers based on historical period
- Real-time event validation via Wikipedia
- Game lobby, gameplay, and results screens

## Architecture

```
src/
├── components/     - UI components (Lobby, Game, Results)
├── context/        - React Context for state management
├── services/       - Wikipedia API integration
├── types/          - TypeScript interfaces
└── utils/          - Game logic and validation
```

## Development Guidelines

1. **Type Safety**: Always use TypeScript types from `types/game.ts`
2. **Mobile-First**: Design for mobile screens, enhance for desktop
3. **Performance**: Minimize re-renders, use React.memo when needed
4. **API Calls**: Rate limit Wikipedia API requests
5. **Validation**: Validate all user inputs client-side

## Game Logic

- Players take turns naming historical events
- Events must be within time buffer from previous event
- Players can call "Bullsh*t" to challenge last event
- Wrong challenges eliminate the caller
- Last player standing wins

## Security Notes

- Sanitize all user inputs before display
- Use environment variables for configuration
- Implement server-side validation for multiplayer
- See SECURITY.md for full security guidelines

## Future Enhancements

- Multiplayer server implementation
- Enhanced Wikipedia date extraction
- Custom game modes
- Player achievements
- Leaderboards

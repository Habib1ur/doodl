import type { GameLanguage, ReactionEmoji, WordCategory } from '../constants/game';

export type GamePhase =
  | 'WAITING'
  | 'STARTING'
  | 'WORD_SELECTION'
  | 'DRAWING'
  | 'ROUND_END'
  | 'GAME_END';

export type PlayerRole = 'DRAWER' | 'GUESSER' | 'SPECTATOR';

export type DrawingTool =
  | 'pencil'
  | 'eraser'
  | 'fill'
  | 'line'
  | 'rect'
  | 'circle'
  | 'spray';

/**
 * Normalized coordinates in [0, 1] relative to canvas width/height
 * so drawings scale cleanly across mobile, tablet, and desktop screens.
 */
export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  playerId: string;
  tool: DrawingTool;
  color: string;
  size: number;
  points: Point[];
  filled?: boolean;
  opacity?: number;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  score: number;
  roundScore: number;
  isHost: boolean;
  isReady: boolean;
  isConnected: boolean;
  hasGuessed: boolean;
  role: PlayerRole;
}

export interface RoomSettings {
  isPublic: boolean;
  language: GameLanguage;
  categories: WordCategory[];
  rounds: number;
  drawTime: number;
  maxPlayers: number;
}

export interface RoomState {
  code: string;
  phase: GamePhase;
  players: Player[];
  settings: RoomSettings;
  currentRound: number;
  totalRounds: number;
  currentDrawerId: string | null;
  wordHint: string;
  wordLength: number;
  phaseEndsAt: number | null;
  serverTime: number;
}

export interface PublicRoomSummary {
  code: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  phase: GamePhase;
  language: GameLanguage;
  rounds: number;
}

export interface ChatMessage {
  id: string;
  playerId: string | null;
  playerName: string;
  text: string;
  type: 'chat' | 'guess-close' | 'correct' | 'system';
  timestamp: number;
}

export interface RoundEndPayload {
  word: string;
  drawerId: string;
  reason: 'all_guessed' | 'time_up' | 'drawer_left';
  roundScores: Record<string, number>;
  players: Player[];
}

export interface GameRankingEntry {
  player: Player;
  rank: number;
  correctGuesses: number;
  pointsEarned: number;
}

export interface GameEndPayload {
  rankings: GameRankingEntry[];
  bestDrawerId: string | null;
  totalRounds: number;
}

export interface ReactionEventPayload {
  id: string;
  playerId: string;
  playerName: string;
  emoji: ReactionEmoji;
  timestamp: number;
}

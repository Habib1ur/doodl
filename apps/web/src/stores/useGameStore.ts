import { create } from 'zustand';
import type {
  ChatMessage,
  GameEndPayload,
  ReactionEventPayload,
  RoomState,
  RoundEndPayload,
  Stroke,
} from '@doodlio/shared';

export interface ToastItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

interface GameStore {
  playerId: string | null;
  sessionToken: string | null;
  room: RoomState | null;
  strokes: Stroke[];
  chatHistory: ChatMessage[];
  wordOptions: string[];
  wordOptionsExpiresAt: number | null;
  secretWord: string | null;
  roundEndData: RoundEndPayload | null;
  gameEndData: GameEndPayload | null;
  reactions: ReactionEventPayload[];
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  toasts: ToastItem[];

  setSession: (payload: {
    playerId: string;
    sessionToken: string;
    room: RoomState;
    strokes: Stroke[];
    chatHistory: ChatMessage[];
  }) => void;
  setRoom: (room: RoomState) => void;
  setStrokes: (strokes: Stroke[]) => void;
  appendStroke: (stroke: Stroke) => void;
  appendStrokePoints: (strokeId: string, points: Stroke['points']) => void;
  clearStrokes: () => void;
  addChatMessage: (msg: ChatMessage) => void;
  setWordOptions: (options: string[], expiresAt: number) => void;
  setSecretWord: (word: string | null) => void;
  setRoundEndData: (data: RoundEndPayload | null) => void;
  setGameEndData: (data: GameEndPayload | null) => void;
  addReaction: (reaction: ReactionEventPayload) => void;
  removeReaction: (id: string) => void;
  setConnectionStatus: (status: 'connecting' | 'connected' | 'disconnected') => void;
  addToast: (message: string, type?: ToastItem['type']) => void;
  removeToast: (id: string) => void;
  resetRoom: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  playerId: null,
  sessionToken: null,
  room: null,
  strokes: [],
  chatHistory: [],
  wordOptions: [],
  wordOptionsExpiresAt: null,
  secretWord: null,
  roundEndData: null,
  gameEndData: null,
  reactions: [],
  connectionStatus: 'connecting',
  toasts: [],

  setSession: ({ playerId, sessionToken, room, strokes, chatHistory }) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(
        `doodlio_session_${room.code}`,
        JSON.stringify({ token: sessionToken, playerId })
      );
    }
    set({
      playerId,
      sessionToken,
      room,
      strokes,
      chatHistory,
      roundEndData: null,
      gameEndData: null,
    });
  },

  setRoom: (room) => set({ room }),

  setStrokes: (strokes) => set({ strokes }),

  appendStroke: (stroke) =>
    set((state) => ({ strokes: [...state.strokes, stroke] })),

  appendStrokePoints: (strokeId, points) =>
    set((state) => ({
      strokes: state.strokes.map((s) =>
        s.id === strokeId ? { ...s, points: [...s.points, ...points] } : s
      ),
    })),

  clearStrokes: () => set({ strokes: [] }),

  addChatMessage: (msg) =>
    set((state) => ({
      chatHistory: [...state.chatHistory.slice(-99), msg],
    })),

  setWordOptions: (wordOptions, wordOptionsExpiresAt) =>
    set({ wordOptions, wordOptionsExpiresAt }),

  setSecretWord: (secretWord) => set({ secretWord }),

  setRoundEndData: (roundEndData) => set({ roundEndData }),

  setGameEndData: (gameEndData) => set({ gameEndData }),

  addReaction: (reaction) =>
    set((state) => ({
      reactions: [...state.reactions.slice(-11), reaction],
    })),

  removeReaction: (id) =>
    set((state) => ({
      reactions: state.reactions.filter((r) => r.id !== id),
    })),

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

  addToast: (message, type = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3500);
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  resetRoom: () =>
    set({
      playerId: null,
      sessionToken: null,
      room: null,
      strokes: [],
      chatHistory: [],
      wordOptions: [],
      wordOptionsExpiresAt: null,
      secretWord: null,
      roundEndData: null,
      gameEndData: null,
      reactions: [],
    }),
}));

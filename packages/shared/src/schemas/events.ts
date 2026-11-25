import { z } from 'zod';
import {
  AVATARS,
  GAME_DEFAULTS,
  REACTION_EMOJIS,
  WORD_CATEGORIES,
} from '../constants/game';

const avatarIds = AVATARS.map((a) => a.id) as [string, ...string[]];

export const playerNameSchema = z
  .string()
  .trim()
  .min(GAME_DEFAULTS.MIN_PLAYER_NAME_LENGTH, 'Nickname must be at least 2 characters')
  .max(GAME_DEFAULTS.MAX_PLAYER_NAME_LENGTH, 'Nickname must be 20 characters or less')
  .regex(/^[a-zA-Z0-9 _-]+$/, 'Only letters, numbers, spaces, _ and - are allowed');

export const avatarSchema = z.enum(avatarIds).default('fox');

export const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(GAME_DEFAULTS.ROOM_CODE_LENGTH, 'Room code must be 6 characters')
  .regex(/^[A-Z0-9]+$/, 'Invalid room code format');

export const roomSettingsSchema = z.object({
  isPublic: z.boolean().default(false),
  language: z.enum(['en', 'bn-en']).default('en'),
  categories: z.array(z.enum(WORD_CATEGORIES)).min(1).default(['random']),
  rounds: z
    .number()
    .int()
    .min(GAME_DEFAULTS.MIN_ROUNDS)
    .max(GAME_DEFAULTS.MAX_ROUNDS)
    .default(GAME_DEFAULTS.DEFAULT_ROUNDS),
  drawTime: z
    .number()
    .int()
    .min(GAME_DEFAULTS.MIN_DRAW_TIME)
    .max(GAME_DEFAULTS.MAX_DRAW_TIME)
    .default(GAME_DEFAULTS.DEFAULT_DRAW_TIME),
  maxPlayers: z
    .number()
    .int()
    .min(GAME_DEFAULTS.MIN_PLAYERS)
    .max(GAME_DEFAULTS.MAX_PLAYERS)
    .default(GAME_DEFAULTS.MAX_PLAYERS),
});

export const createRoomSchema = z.object({
  playerName: playerNameSchema,
  avatar: avatarSchema,
  settings: roomSettingsSchema.partial().optional(),
  authToken: z.string().min(10).optional(),
});

export const joinRoomSchema = z.object({
  code: roomCodeSchema,
  playerName: playerNameSchema,
  avatar: avatarSchema,
  authToken: z.string().min(10).optional(),
});

export const updateSettingsSchema = roomSettingsSchema.partial();

export const readyToggleSchema = z.object({
  isReady: z.boolean(),
});

export const selectWordSchema = z.object({
  word: z.string().trim().min(1).max(60),
});

export const pointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const drawingStartSchema = z.object({
  strokeId: z.string().min(1).max(64),
  tool: z.enum(['pencil', 'eraser', 'fill', 'line', 'rect', 'circle', 'spray']),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  size: z.number().min(1).max(64),
  point: pointSchema,
  filled: z.boolean().optional(),
  opacity: z.number().min(0.1).max(1).optional(),
});

export const drawingMoveSchema = z.object({
  strokeId: z.string().min(1).max(64),
  points: z.array(pointSchema).min(1).max(100),
});

export const drawingEndSchema = z.object({
  strokeId: z.string().min(1).max(64),
});

export const chatOrGuessSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(GAME_DEFAULTS.MAX_MESSAGE_LENGTH, 'Message is too long'),
});

export const reactionSendSchema = z.object({
  emoji: z.enum(REACTION_EMOJIS),
});

export const reconnectSchema = z.object({
  token: z.string().min(10),
  roomCode: roomCodeSchema,
});

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be 20 characters or less')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Only letters, numbers, _ and - are allowed'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(72, 'Password is too long'),
  avatar: avatarSchema,
});

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const reportSchema = z.object({
  roomCode: roomCodeSchema,
  reportedName: z.string().trim().min(1).max(30),
  reason: z.enum(['inappropriate_drawing', 'abusive_chat', 'cheating', 'spam']),
  details: z.string().trim().max(300).optional(),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type DrawingStartInput = z.infer<typeof drawingStartSchema>;
export type DrawingMoveInput = z.infer<typeof drawingMoveSchema>;
export type DrawingEndInput = z.infer<typeof drawingEndSchema>;
export type ChatOrGuessInput = z.infer<typeof chatOrGuessSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ReportInput = z.infer<typeof reportSchema>;

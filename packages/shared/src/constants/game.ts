export const GAME_DEFAULTS = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 10,
  MIN_ROUNDS: 1,
  MAX_ROUNDS: 10,
  DEFAULT_ROUNDS: 3,
  MIN_DRAW_TIME: 0,
  MAX_DRAW_TIME: 180,
  DEFAULT_DRAW_TIME: 80,
  WORD_SELECTION_TIME: 15,
  ROUND_END_TIME: 5,
  MAX_PLAYER_NAME_LENGTH: 20,
  MIN_PLAYER_NAME_LENGTH: 2,
  MAX_MESSAGE_LENGTH: 200,
  ROOM_CODE_LENGTH: 6,
  RECONNECT_GRACE_MS: 60_000,
  EMPTY_ROOM_TTL_MS: 300_000,
} as const;

export const SCORING = {
  FIRST_GUESS: 100,
  SECOND_GUESS: 80,
  THIRD_GUESS: 60,
  OTHER_GUESS: 40,
  DRAWER_PER_GUESS: 25,
  DRAWER_ALL_GUESSED_BONUS: 25,
} as const;

export const DRAWING_PALETTE = [
  { name: 'Black', hex: '#172B25' },
  { name: 'Dark Gray', hex: '#4B5563' },
  { name: 'Gray', hex: '#95A49D' },
  { name: 'Light Gray', hex: '#D1D5DB' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Crimson', hex: '#B91C1C' },
  { name: 'Red', hex: '#E65C68' },
  { name: 'Coral', hex: '#FB7185' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Yellow', hex: '#F2A93B' },
  { name: 'Lime', hex: '#84CC16' },
  { name: 'Green', hex: '#16A36A' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Teal', hex: '#16B8A6' },
  { name: 'Cyan', hex: '#06B6D4' },
  { name: 'Sky', hex: '#38BDF8' },
  { name: 'Blue', hex: '#3478F6' },
  { name: 'Indigo', hex: '#4F46E5' },
  { name: 'Purple', hex: '#8B5CF6' },
  { name: 'Magenta', hex: '#D946EF' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Brown', hex: '#8B5E3C' },
  { name: 'Peach', hex: '#FDBA74' },
] as const;

export const BRUSH_SIZES = [3, 6, 12, 20, 32] as const;

export const AVATARS = [
  { id: 'fox', label: 'Fox', emoji: '🦊', bg: '#FEE2E2' },
  { id: 'frog', label: 'Frog', emoji: '🐸', bg: '#DDF8EC' },
  { id: 'octopus', label: 'Octopus', emoji: '🐙', bg: '#EAF3FF' },
  { id: 'panda', label: 'Panda', emoji: '🐼', bg: '#F3F4F6' },
  { id: 'tiger', label: 'Tiger', emoji: '🐯', bg: '#FEF3C7' },
  { id: 'unicorn', label: 'Unicorn', emoji: '🦄', bg: '#F3E8FF' },
  { id: 'penguin', label: 'Penguin', emoji: '🐧', bg: '#E0F2FE' },
  { id: 'koala', label: 'Koala', emoji: '🐨', bg: '#E5EEE9' },
  { id: 'bee', label: 'Bee', emoji: '🐝', bg: '#FEF9C3' },
  { id: 'dino', label: 'Dino', emoji: '🦖', bg: '#DCFCE7' },
  { id: 'cat', label: 'Cat', emoji: '🐱', bg: '#FFEDD5' },
  { id: 'robot', label: 'Robot', emoji: '🤖', bg: '#DBEAFE' },
] as const;

export const WORD_CATEGORIES = [
  'random',
  'easy',
  'medium',
  'hard',
  'animals',
  'food',
  'objects',
  'places',
  'technology',
  'entertainment',
  'sports',
  'nature',
] as const;

export type WordCategory = (typeof WORD_CATEGORIES)[number];

export const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'bn-en', label: 'Bengali-English' },
] as const;

export type GameLanguage = (typeof LANGUAGES)[number]['id'];

export const REACTION_EMOJIS = ['👏', '🔥', '😂', '😮', '❤️', '🎨'] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

import type { GameLanguage, WordCategory } from '@doodlio/shared';

export interface WordEntry {
  text: string;
  language: GameLanguage;
  category: Exclude<WordCategory, 'random'>;
  aliases?: string[];
}

export const BUILTIN_WORDS: WordEntry[] = [
  // Easy & Everyday
  { text: 'cat', language: 'en', category: 'animals' },
  { text: 'dog', language: 'en', category: 'animals' },
  { text: 'fish', language: 'en', category: 'animals' },
  { text: 'bird', language: 'en', category: 'animals' },
  { text: 'lion', language: 'en', category: 'animals' },
  { text: 'elephant', language: 'en', category: 'animals' },
  { text: 'penguin', language: 'en', category: 'animals' },
  { text: 'butterfly', language: 'en', category: 'animals' },
  { text: 'giraffe', language: 'en', category: 'animals' },
  { text: 'octopus', language: 'en', category: 'animals' },
  { text: 'kangaroo', language: 'en', category: 'animals' },
  { text: 'turtle', language: 'en', category: 'animals' },

  // Food
  { text: 'pizza', language: 'en', category: 'food' },
  { text: 'burger', language: 'en', category: 'food' },
  { text: 'ice cream', language: 'en', category: 'food', aliases: ['icecream'] },
  { text: 'banana', language: 'en', category: 'food' },
  { text: 'watermelon', language: 'en', category: 'food' },
  { text: 'cupcake', language: 'en', category: 'food' },
  { text: 'pancake', language: 'en', category: 'food' },
  { text: 'sushi', language: 'en', category: 'food' },
  { text: 'mango', language: 'en', category: 'food' },
  { text: 'coffee', language: 'en', category: 'food' },

  // Objects
  { text: 'umbrella', language: 'en', category: 'objects' },
  { text: 'bicycle', language: 'en', category: 'objects', aliases: ['bike'] },
  { text: 'backpack', language: 'en', category: 'objects' },
  { text: 'glasses', language: 'en', category: 'objects', aliases: ['eyeglasses'] },
  { text: 'guitar', language: 'en', category: 'objects' },
  { text: 'camera', language: 'en', category: 'objects' },
  { text: 'compass', language: 'en', category: 'objects' },
  { text: 'lantern', language: 'en', category: 'objects' },
  { text: 'scissors', language: 'en', category: 'objects' },
  { text: 'telescope', language: 'en', category: 'objects' },

  // Places
  { text: 'beach', language: 'en', category: 'places' },
  { text: 'castle', language: 'en', category: 'places' },
  { text: 'airport', language: 'en', category: 'places' },
  { text: 'hospital', language: 'en', category: 'places' },
  { text: 'lighthouse', language: 'en', category: 'places' },
  { text: 'library', language: 'en', category: 'places' },
  { text: 'pyramid', language: 'en', category: 'places' },
  { text: 'island', language: 'en', category: 'places' },

  // Technology
  { text: 'laptop', language: 'en', category: 'technology' },
  { text: 'headphones', language: 'en', category: 'technology' },
  { text: 'keyboard', language: 'en', category: 'technology' },
  { text: 'robot', language: 'en', category: 'technology' },
  { text: 'rocket', language: 'en', category: 'technology' },
  { text: 'satellite', language: 'en', category: 'technology' },
  { text: 'smartphone', language: 'en', category: 'technology', aliases: ['phone'] },
  { text: 'drone', language: 'en', category: 'technology' },

  // Entertainment
  { text: 'popcorn', language: 'en', category: 'entertainment' },
  { text: 'microphone', language: 'en', category: 'entertainment', aliases: ['mic'] },
  { text: 'wizard', language: 'en', category: 'entertainment' },
  { text: 'pirate', language: 'en', category: 'entertainment' },
  { text: 'superhero', language: 'en', category: 'entertainment' },
  { text: 'clown', language: 'en', category: 'entertainment' },

  // Sports
  { text: 'cricket', language: 'en', category: 'sports' },
  { text: 'football', language: 'en', category: 'sports', aliases: ['soccer'] },
  { text: 'basketball', language: 'en', category: 'sports' },
  { text: 'tennis', language: 'en', category: 'sports' },
  { text: 'swimming', language: 'en', category: 'sports' },
  { text: 'archery', language: 'en', category: 'sports' },

  // Nature
  { text: 'rainbow', language: 'en', category: 'nature' },
  { text: 'volcano', language: 'en', category: 'nature' },
  { text: 'waterfall', language: 'en', category: 'nature' },
  { text: 'cactus', language: 'en', category: 'nature' },
  { text: 'tornado', language: 'en', category: 'nature' },
  { text: 'sunrise', language: 'en', category: 'nature' },
  { text: 'mountain', language: 'en', category: 'nature' },

  // Difficulty tags
  { text: 'sun', language: 'en', category: 'easy' },
  { text: 'tree', language: 'en', category: 'easy' },
  { text: 'house', language: 'en', category: 'easy' },
  { text: 'star', language: 'en', category: 'easy' },
  { text: 'boat', language: 'en', category: 'easy' },
  { text: 'treehouse', language: 'en', category: 'medium' },
  { text: 'skateboard', language: 'en', category: 'medium' },
  { text: 'hourglass', language: 'en', category: 'hard' },
  { text: 'constellation', language: 'en', category: 'hard' },
  { text: 'chameleon', language: 'en', category: 'hard' },

  // Bengali-English (Banglish / Cultural)
  { text: 'biryani', language: 'bn-en', category: 'food', aliases: ['biriyani'] },
  { text: 'fuchka', language: 'bn-en', category: 'food', aliases: ['phuchka', 'panipuri'] },
  { text: 'samosa', language: 'bn-en', category: 'food', aliases: ['singara'] },
  { text: 'jalebi', language: 'bn-en', category: 'food', aliases: ['jilapi'] },
  { text: 'mishti', language: 'bn-en', category: 'food', aliases: ['roshogolla'] },
  { text: 'chai', language: 'bn-en', category: 'food', aliases: ['cha', 'tea'] },
  { text: 'hilsa', language: 'bn-en', category: 'animals', aliases: ['ilish'] },
  { text: 'bengal tiger', language: 'bn-en', category: 'animals', aliases: ['tiger'] },
  { text: 'rickshaw', language: 'bn-en', category: 'objects', aliases: ['rikshaw'] },
  { text: 'nouka', language: 'bn-en', category: 'objects', aliases: ['boat'] },
  { text: 'ektara', language: 'bn-en', category: 'objects' },
  { text: 'tabla', language: 'bn-en', category: 'objects' },
  { text: 'sundarbans', language: 'bn-en', category: 'places' },
  { text: 'shaheed minar', language: 'bn-en', category: 'places' },
  { text: 'cricket', language: 'bn-en', category: 'sports' },
  { text: 'kabaddi', language: 'bn-en', category: 'sports' },
  { text: 'monsoon', language: 'bn-en', category: 'nature', aliases: ['borsha'] },
  { text: 'shapla', language: 'bn-en', category: 'nature', aliases: ['water lily'] },
];

export function pickWordOptions(
  language: GameLanguage,
  categories: WordCategory[],
  usedWords: Set<string>,
  count = 3
): string[] {
  const includeAllCategories = categories.includes('random');

  let pool = BUILTIN_WORDS.filter((w) => {
    const langMatch = language === 'bn-en' ? w.language === 'bn-en' || w.language === 'en' : w.language === 'en';
    const catMatch = includeAllCategories || categories.includes(w.category);
    return langMatch && catMatch && !usedWords.has(w.text);
  });

  if (pool.length < count) {
    pool = BUILTIN_WORDS.filter((w) =>
      language === 'bn-en' ? w.language === 'bn-en' || w.language === 'en' : w.language === 'en'
    );
  }

  // Shuffle copy
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const picked: string[] = [];
  const seen = new Set<string>();
  for (const item of shuffled) {
    if (!seen.has(item.text)) {
      seen.add(item.text);
      picked.push(item.text);
    }
    if (picked.length >= count) break;
  }
  return picked;
}

export function createInitialHint(word: string): string {
  return word
    .split('')
    .map((ch) => (ch === ' ' ? ' ' : '_'))
    .join('');
}

export function revealOneHintLetter(word: string, currentHint: string): string {
  const chars = currentHint.split('');
  const hiddenIndices: number[] = [];
  for (let i = 0; i < word.length; i++) {
    if (word[i] !== ' ' && chars[i] === '_') {
      hiddenIndices.push(i);
    }
  }
  if (hiddenIndices.length <= 1) {
    return currentHint; // Never reveal the entire word via hints
  }
  const idx = hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)];
  if (idx !== undefined && word[idx]) {
    chars[idx] = word[idx];
  }
  return chars.join('');
}

export function normalizeGuess(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/['’`.,!?-]/g, '')
    .replace(/\s+/g, ' ');
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost
      );
    }
  }
  return dp[m]![n]!;
}

export type GuessResult = 'exact' | 'close' | 'miss';

export function evaluateGuess(guess: string, secretWord: string): GuessResult {
  const normGuess = normalizeGuess(guess);
  const normSecret = normalizeGuess(secretWord);
  if (!normGuess) return 'miss';

  if (normGuess === normSecret) {
    return 'exact';
  }

  const entry = BUILTIN_WORDS.find((w) => normalizeGuess(w.text) === normSecret);
  if (entry?.aliases?.some((alias) => normalizeGuess(alias) === normGuess)) {
    return 'exact';
  }

  if (normSecret.length >= 4 && levenshtein(normGuess, normSecret) === 1) {
    return 'close';
  }

  return 'miss';
}

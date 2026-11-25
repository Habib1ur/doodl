import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORIES = [
  { slug: 'easy', name: 'Easy' },
  { slug: 'medium', name: 'Medium' },
  { slug: 'hard', name: 'Hard' },
  { slug: 'animals', name: 'Animals' },
  { slug: 'food', name: 'Food' },
  { slug: 'objects', name: 'Objects' },
  { slug: 'places', name: 'Places' },
  { slug: 'technology', name: 'Technology' },
  { slug: 'entertainment', name: 'Movies & Entertainment' },
  { slug: 'sports', name: 'Sports' },
  { slug: 'nature', name: 'Nature' },
];

const SEED_WORDS: Array<{
  text: string;
  language: 'en' | 'bn-en';
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  aliases?: string[];
}> = [
  { text: 'cat', language: 'en', difficulty: 'easy', category: 'animals' },
  { text: 'dog', language: 'en', difficulty: 'easy', category: 'animals' },
  { text: 'elephant', language: 'en', difficulty: 'medium', category: 'animals' },
  { text: 'penguin', language: 'en', difficulty: 'medium', category: 'animals' },
  { text: 'pizza', language: 'en', difficulty: 'easy', category: 'food' },
  { text: 'burger', language: 'en', difficulty: 'easy', category: 'food' },
  { text: 'biryani', language: 'bn-en', difficulty: 'easy', category: 'food', aliases: ['biriyani'] },
  { text: 'fuchka', language: 'bn-en', difficulty: 'easy', category: 'food', aliases: ['phuchka', 'panipuri'] },
  { text: 'rickshaw', language: 'bn-en', difficulty: 'medium', category: 'objects', aliases: ['rikshaw'] },
  { text: 'laptop', language: 'en', difficulty: 'easy', category: 'technology' },
  { text: 'headphones', language: 'en', difficulty: 'medium', category: 'technology' },
  { text: 'satellite', language: 'en', difficulty: 'hard', category: 'technology' },
  { text: 'cricket', language: 'en', difficulty: 'easy', category: 'sports' },
  { text: 'football', language: 'en', difficulty: 'easy', category: 'sports', aliases: ['soccer'] },
  { text: 'rainbow', language: 'en', difficulty: 'easy', category: 'nature' },
  { text: 'waterfall', language: 'en', difficulty: 'medium', category: 'nature' },
  { text: 'lighthouse', language: 'en', difficulty: 'hard', category: 'places' },
  { text: 'sundarbans', language: 'bn-en', difficulty: 'hard', category: 'places' },
];

const ACHIEVEMENTS = [
  {
    slug: 'first-win',
    title: 'First Victory',
    description: 'Win your first match of Doodl.',
    icon: '🏆',
  },
  {
    slug: 'speed-guesser',
    title: 'Speed Guesser',
    description: 'Guess the secret word first in a round.',
    icon: '⚡',
  },
  {
    slug: 'master-artist',
    title: 'Master Artist',
    description: 'Have every player in the room guess your drawing.',
    icon: '🎨',
  },
  {
    slug: 'social-butterfly',
    title: 'Social Butterfly',
    description: 'Play 10 matches with friends.',
    icon: '🦋',
  },
];

async function main() {
  for (const cat of CATEGORIES) {
    await prisma.wordCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name },
      create: cat,
    });
  }

  const categoryRows = await prisma.wordCategory.findMany();
  const categoryMap = new Map(categoryRows.map((c) => [c.slug, c.id]));

  for (const word of SEED_WORDS) {
    const categoryId = categoryMap.get(word.category);
    if (!categoryId) continue;
    await prisma.word.upsert({
      where: {
        text_language: { text: word.text, language: word.language },
      },
      update: {
        difficulty: word.difficulty,
        categoryId,
        aliases: word.aliases ?? [],
      },
      create: {
        text: word.text,
        language: word.language,
        difficulty: word.difficulty,
        categoryId,
        aliases: word.aliases ?? [],
      },
    });
  }

  for (const ach of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { slug: ach.slug },
      update: ach,
      create: ach,
    });
  }

  console.log('Seeded Doodl categories, words, and achievements.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

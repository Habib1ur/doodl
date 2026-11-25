import { describe, expect, it } from 'vitest';
import {
  createInitialHint,
  evaluateGuess,
  pickWordOptions,
  revealOneHintLetter,
} from '../src/game/words';

describe('Word packs and guess evaluation', () => {
  it('picks unique word options for English and Bengali-English', () => {
    const enOptions = pickWordOptions('en', ['random'], new Set(), 3);
    expect(enOptions).toHaveLength(3);
    expect(new Set(enOptions).size).toBe(3);

    const bnOptions = pickWordOptions('bn-en', ['food'], new Set(), 3);
    expect(bnOptions).toHaveLength(3);
    expect(new Set(bnOptions).size).toBe(3);
  });

  it('generates masked hints and never reveals the entire word', () => {
    const word = 'cat';
    let hint = createInitialHint(word);
    expect(hint).toBe('___');

    hint = revealOneHintLetter(word, hint);
    expect(hint.replace(/_/g, '').length).toBe(1);

    hint = revealOneHintLetter(word, hint);
    expect(hint.replace(/_/g, '').length).toBe(2);

    // Should stop revealing when only 1 letter remains hidden
    const finalHint = revealOneHintLetter(word, hint);
    expect(finalHint).toBe(hint);
  });

  it('evaluates exact, alias, close, and miss guesses accurately', () => {
    expect(evaluateGuess('  PIZZA! ', 'pizza')).toBe('exact');
    expect(evaluateGuess('biriyani', 'biryani')).toBe('exact');
    expect(evaluateGuess('pizaa', 'pizza')).toBe('close');
    expect(evaluateGuess('banana', 'pizza')).toBe('miss');
  });
});

import { describe, it, expect } from 'vitest';
import { PROMPT_QUESTIONS } from './prompts';

describe('PROMPT_QUESTIONS', () => {
  it('contains 10 questions', () => {
    expect(PROMPT_QUESTIONS).toHaveLength(10);
  });

  it('each question has unique id and non-empty text', () => {
    for (const q of PROMPT_QUESTIONS) {
      expect(q.id).toBeTruthy();
      expect(q.text).toBeTruthy();
      expect(q.text.endsWith('？')).toBe(true);
    }
  });

  it('ids are unique', () => {
    const ids = PROMPT_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

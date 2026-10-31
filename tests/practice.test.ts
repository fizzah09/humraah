import { describe, expect, it } from 'vitest';
import { LESSONS, SCAM_QUIZ } from '@/lib/practice/lessons';
import { PLAYBOOKS } from '@/lib/assistant/playbooks';

describe('practice lessons', () => {
  it.each(LESSONS.map((l) => [l.id, l] as const))('%s is well-formed', (_, l) => {
    for (const s of l.steps) {
      expect(s.why.length).toBeGreaterThan(10);
      if (s.kind === 'tap') expect(s.buttons.some((b) => b.id === s.correct)).toBe(true);
      if (s.kind === 'quiz') expect(s.options.filter((o) => o.correct)).toHaveLength(1);
      if (s.kind === 'input') expect(s.expected).toMatch(/^\d+$/);
    }
    expect(l.recap.length).toBe(3);
  });
  it('scam quiz has both scams and a genuine alert', () => {
    expect(SCAM_QUIZ.some((q) => q.scam)).toBe(true);
    expect(SCAM_QUIZ.some((q) => !q.scam)).toBe(true);
  });
  it('every assistant playbook step explains why', () => {
    for (const p of PLAYBOOKS) for (const s of p.steps) expect(s.why.length).toBeGreaterThan(10);
  });
});

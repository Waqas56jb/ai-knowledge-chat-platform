import { describe, it, expect, vi, beforeEach } from 'vitest';

const calls = vi.hoisted(() => ({ outputs: [], n: 0 }));
vi.mock('../../src/services/openai.service.js', () => ({
  chatJson: vi.fn(async () => {
    const o = calls.outputs[calls.n++];
    if (o instanceof Error) throw o;
    return { content: o, usage: {}, model: 'mock' };
  }),
  embed: vi.fn()
}));
const { rerank, expandQuery } = await import('../../src/services/retrievalAssist.service.js');

const cands = [1, 2, 3, 4, 5].map(i => ({ chunk_id: `c${i}`, source_title: `T${i}`, content: `passage ${i}` }));
beforeEach(() => { calls.outputs = []; calls.n = 0; });

describe('AI rerank', () => {
  it('maps [id, score] pairs to the right passages, clamped to 0..3', async () => {
    calls.outputs = [JSON.stringify({ scores: [[3, 3], [1, 0], [2, 9], [5, 1], [4, 2]] })];
    const m = await rerank('q', cands);
    expect([...m.entries()]).toEqual(expect.arrayContaining([['c3', 3], ['c1', 0], ['c2', 3], ['c5', 1], ['c4', 2]]));
  });
  it('does not trust a bare score list (it could be shifted) or an incomplete scoring', async () => {
    calls.outputs = [JSON.stringify({ scores: [3, 0, 2, 1, 1] }), JSON.stringify({ scores: [3, 0] })];
    expect(await rerank('q', cands)).toBe(null);
  });
  it('retries once after an API error, then falls back to null without throwing', async () => {
    calls.outputs = [new Error('timeout'), JSON.stringify({ scores: [[1, 1], [2, 1], [3, 1], [4, 1], [5, 1]] })];
    expect((await rerank('q', cands)).size).toBe(5);
    calls.outputs = [new Error('down'), new Error('still down')]; calls.n = 0;
    expect(await rerank('q', cands)).toBe(null);
  });
});

describe('query expansion', () => {
  it('returns up to 3 new, distinct queries and never the question itself', async () => {
    calls.outputs = [JSON.stringify({ queries: ['How do I find pharmacies?', 'selling test strips to pharmacies', 'Selling test strips to pharmacies', 'pharmacy buyers', 'wholesale distributors', 42] })];
    expect(await expandQuery('How do I find pharmacies?')).toEqual(['selling test strips to pharmacies', 'pharmacy buyers', 'wholesale distributors']);
  });
  it('gives no rewrites (plain search) when the model output is unusable', async () => {
    calls.outputs = ['not json', 'still not json'];
    expect(await expandQuery('anything')).toEqual([]);
  });
});

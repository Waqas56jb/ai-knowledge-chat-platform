import { describe, it, expect, vi, beforeEach } from 'vitest';

const m = vi.hoisted(() => ({ out: null, calls: [] }));
vi.mock('../../src/services/openai.service.js', () => ({
  chatJson: vi.fn(async messages => {
    m.calls.push(messages);
    if (m.out instanceof Error) throw m.out;
    return { content: m.out, usage: {}, model: 'mock' };
  }),
  embed: vi.fn()
}));
const { decideClarify, needsPurchaseDisclaimer } = await import('../../src/services/clarify.service.js');
beforeEach(() => { m.out = null; m.calls = []; });

describe('clarify decision', () => {
  it('returns up to 3 cleaned, distinct questions when clarification is needed', async () => {
    m.out = JSON.stringify({ needs: true, questions: ['1. What is your monthly revenue?', 'What is your monthly revenue?', '- How many campaigns?', 'x', 'Where do you operate?', 'Extra?'] });
    expect(await decideClarify('How much should I spend on ads?')).toEqual({ needs: true, questions: ['What is your monthly revenue?', 'How many campaigns?', 'Where do you operate?'] });
  });
  it('passes the conversation and the hidden profile as fenced data', async () => {
    m.out = JSON.stringify({ needs: false, questions: [] });
    await decideClarify('Should I hire?', { history: [{ role: 'user', content: 'I run 3 campaigns' }], profile: 'Revenue: $60k/month' });
    const sent = m.calls[0][1].content;
    expect(sent).toContain('<member_profile>\nRevenue: $60k/month\n</member_profile>');
    expect(sent).toContain('Member: I run 3 campaigns');
  });
  it('never clarifies on bad output, needs without questions, or errors', async () => {
    m.out = 'not json';
    expect((await decideClarify('q')).needs).toBe(false);
    m.out = JSON.stringify({ needs: true, questions: [] });
    expect((await decideClarify('q')).needs).toBe(false);
    m.out = new Error('down');
    expect(await decideClarify('q')).toEqual({ needs: false, questions: [] });
  });
});

describe('purchase disclaimer detection', () => {
  it('applies when the model flags it or the exchange is about what to buy/stock', () => {
    expect(needsPurchaseDisclaimer('How do I grow?', 'Grow by ...', true)).toBe(true);
    expect(needsPurchaseDisclaimer('Which products should I buy first?', 'You should buy major brand test strips such as OneTouch.', false)).toBe(true);
    expect(needsPurchaseDisclaimer('What brands should I stock?', 'Stock Accu-Chek and Contour strips.', false)).toBe(true);
  });
  it('does not apply to non-buying advice', () => {
    expect(needsPurchaseDisclaimer('Why do people fail to get funding?', 'They lack an LLC.', false)).toBe(false);
    expect(needsPurchaseDisclaimer('How do I hire a VA?', 'Write clear tasks.', false)).toBe(false);
  });
});

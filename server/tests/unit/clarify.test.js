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
const { decideClarify, needsPurchaseDisclaimer, needsAdsNote, shapeQuestions, STAGE_QUESTION } = await import('../../src/services/clarify.service.js');
beforeEach(() => { m.out = null; m.calls = []; });

describe('clarify decision', () => {
  it('returns up to 3 cleaned, distinct questions when clarification is needed', async () => {
    m.out = JSON.stringify({ needs: true, questions: ['1. What is your monthly revenue?', 'What is your monthly revenue?', '- How many campaigns?', 'x', 'Where do you operate?', 'Extra?'] });
    // the client's stage question always leads (and replaces the model's revenue variant); max 3
    expect(await decideClarify('How much should I spend on ads?')).toEqual({ needs: true, questions: [STAGE_QUESTION, 'How many campaigns?', 'Where do you operate?'] });
  });
  it('never asks about the target audience (it is always diabetics)', async () => {
    m.out = JSON.stringify({ needs: true, questions: ['Who is your target audience?', 'What is your target market?', 'Who are your ideal customers?', 'How many campaigns are you running?'] });
    expect((await decideClarify('How should I grow?')).questions).toEqual([STAGE_QUESTION, 'How many campaigns are you running?']);
  });
  it('does not repeat the stage question when stage and revenue are already known', async () => {
    m.out = JSON.stringify({ needs: true, questions: ['How many campaigns are you running?'] });
    expect((await decideClarify('How should I grow?', { profile: 'Stage: growing\nRevenue: $60k/month' })).questions).toEqual(['How many campaigns are you running?']);
    expect(shapeQuestions(['Who is your target audience?'], 'Stage: growing\nRevenue: $60k/month')).toEqual([]);
  });
  it('does not add the stage question when the member already stated revenue, stage or job', () => {
    expect(shapeQuestions(['How many campaigns?'], null, 'I make $20k a month and have a full-time job')).toEqual(['How many campaigns?']);
    expect(shapeQuestions(['How many campaigns?'], null, 'I just started 6 months ago')).toEqual(['How many campaigns?']);
    expect(shapeQuestions(['How many campaigns?'], null, 'How should I grow?')).toEqual([STAGE_QUESTION, 'How many campaigns?']);
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

describe('Scaleyourdts.com note for ads answers', () => {
  it('applies to ads questions, model-flagged answers and answers mostly about ads', () => {
    expect(needsAdsNote('How much should I spend on Facebook ads?', '', false)).toBe(true);
    expect(needsAdsNote('How do I lower my cost per lead?', '', false)).toBe(true);
    expect(needsAdsNote('How do I grow?', 'x', true)).toBe(true);
    expect(needsAdsNote('How do I get more sellers?', 'Run Facebook ads with a clear offer. Test ad creatives weekly.', false)).toBe(true);
  });
  it('does not apply to other topics', () => {
    expect(needsAdsNote('What is DTS?', 'DTS means diabetic test strips.', false)).toBe(false);
    expect(needsAdsNote('How do I address this?', 'About the address on the box.', false)).toBe(false);
    expect(needsAdsNote('Do I need an LLC?', 'Lenders want an LLC; ads were not discussed.', false)).toBe(false);
  });
});

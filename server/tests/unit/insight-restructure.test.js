import { describe, it, expect } from 'vitest';
import { scrubContactDetails, splitParts, parseEntries, renderEntries } from '../../src/services/restructure.service.js';
import { normalizeExtraction } from '../../src/services/insight.service.js';

describe('client conversation restructuring', () => {
  it('removes emails, phone numbers and links but keeps prices and quantities', () => {
    const t = scrubContactDetails('Call me on +1 (813) 555-0142 or 813.555.0142, mail john.doe@acme.com, see https://acme.com/x. 40 boxes at $25 each by 12/05.');
    expect(t).not.toMatch(/555|john\.doe|acme\.com/);
    expect(t).toContain('[phone]');
    expect(t).toContain('[email]');
    expect(t).toContain('[link]');
    expect(t).toContain('40 boxes at $25 each');
  });
  it('splits long logs on line boundaries', () => {
    const parts = splitParts(Array.from({ length: 50 }, (_, i) => `line ${i} ${'x'.repeat(30)}`).join('\n'), 400);
    expect(parts.length).toBeGreaterThan(3);
    expect(parts.every(p => p.length <= 400)).toBe(true);
    expect(parts.join('\n').split('\n')).toHaveLength(50);
  });
  it('parses and renders model entries, dropping empty ones and invalid output', () => {
    expect(parseEntries('not json')).toEqual([]);
    const e = parseEntries(JSON.stringify({ entries: [
      { topic: 'Price objection', situation: 'Client wanted $30/box', clientPosition: 'Higher price', approach: ['Anchored on market rate', 3], outcome: 'Agreed $27', lesson: 'Anchor first' },
      { topic: 'empty' }
    ] }));
    expect(e).toHaveLength(1);
    expect(e[0].approach).toEqual(['Anchored on market rate']);
    const text = renderEntries(e, { title: 'Call with pharmacy', category: 'Negotiation' });
    expect(text).toContain('Case 1: Price objection');
    expect(text).toContain('How it was handled:\n- Anchored on market rate');
    expect(text).toContain('Context: Negotiation');
  });
});

describe('business profile extraction', () => {
  it('normalises fields: unknown → null, stage enum, lists lowercased and de-duplicated', () => {
    const v = normalizeExtraction(JSON.stringify({
      businessName: '  Sun Supplies LLC ', businessType: 'test strip reseller', userRole: 'Owner', city: 'unknown', state: 'Florida', country: 'United States',
      businessStage: 'Growing', products: ['Test Strips', 'test strips', 'Insulin Pens'], clientTypes: 'pharmacies', monthlyVolume: null, teamSize: 'N/A', summary: 'Owner of a small reseller.'
    }));
    expect(v).toMatchObject({ businessName: 'Sun Supplies LLC', city: null, state: 'Florida', businessStage: 'growing', products: ['test strips', 'insulin pens'], clientTypes: [], teamSize: null });
    expect(normalizeExtraction(JSON.stringify({ businessStage: 'unicorn' })).businessStage).toBe(null);
    expect(normalizeExtraction('{broken')).toBe(null);
  });
});

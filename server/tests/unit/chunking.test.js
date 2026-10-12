import { describe, it, expect } from 'vitest';
import { chunkText, chunkPages, chunkSegments, normalizeText, estimateTokens } from '../../src/services/chunking.service.js';

describe('chunking', () => {
  const para = i => `Paragraph ${i}. ` + 'This sentence talks about pricing and negotiation strategy. '.repeat(6);

  it('keeps chunks within the size limit and never empty', () => {
    const chunks = chunkText(Array.from({ length: 20 }, (_, i) => para(i)).join('\n\n'), { chunkSize: 800, chunkOverlap: 100 });
    expect(chunks.length).toBeGreaterThan(3);
    for (const c of chunks) { expect(c.content.length).toBeGreaterThan(0); expect(c.content.length).toBeLessThanOrEqual(800 + 120); }
  });

  it('adds overlap between consecutive chunks', () => {
    const chunks = chunkText(Array.from({ length: 10 }, (_, i) => para(i)).join('\n\n'), { chunkSize: 600, chunkOverlap: 120 });
    const tail = chunks[0].content.slice(-40);
    expect(chunks[1].content).toContain(tail.split(' ').slice(-3).join(' '));
  });

  it('splits a single huge paragraph on sentence boundaries', () => {
    const text = Array.from({ length: 200 }, (_, i) => `Short sentence number ${i}.`).join(' ');
    const chunks = chunkText(text, { chunkSize: 500, chunkOverlap: 50 });
    expect(chunks.length).toBeGreaterThan(5);
    expect(chunks.every(c => c.content.length <= 560)).toBe(true);
  });

  it('keeps PDF page numbers and never spans pages', () => {
    const chunks = chunkPages([{ page: 1, text: 'First page text.' }, { page: 3, text: 'Third page text.' }], { chunkSize: 1000, chunkOverlap: 0 });
    expect(chunks.map(c => c.pageNumber)).toEqual([1, 3]);
  });

  it('keeps transcript start/end seconds', () => {
    const segs = Array.from({ length: 40 }, (_, i) => ({ text: `segment ${i} words words words words`, start: i * 5, duration: 5 }));
    const chunks = chunkSegments(segs, { chunkSize: 200, chunkOverlap: 40 });
    expect(chunks.length).toBeGreaterThan(3);
    expect(chunks[0].startSeconds).toBe(0);
    for (const c of chunks) expect(c.endSeconds).toBeGreaterThan(c.startSeconds);
    expect(chunks[1].startSeconds).toBeGreaterThan(0);
  });

  it('normalises control characters and whitespace', () => {
    expect(normalizeText('a\u0000b\r\n\r\n\r\n\r\nc   d e')).toBe('ab\n\nc d e');
    expect(estimateTokens('12345678')).toBe(2);
  });
});

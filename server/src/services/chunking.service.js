/**
 * Chunking. Paragraph-aware for documents/text, segment-aware for transcripts (keeps start/end
 * seconds) and page-aware for PDFs (keeps page numbers). Sizes are in characters; token counts are
 * estimated at ~4 characters per token.
 */
export const estimateTokens = s => Math.ceil(String(s).length / 4);

function splitLong(text, size) {
  // split an over-long paragraph on sentence boundaries, then hard-wrap if needed
  const sentences = text.match(/[^.!?\n]+[.!?]+["')\]]*\s*|[^.!?\n]+$/g) || [text];
  const out = []; let cur = '';
  for (const s of sentences) {
    if ((cur + s).length > size && cur) { out.push(cur.trim()); cur = ''; }
    if (s.length > size) { for (let i = 0; i < s.length; i += size) out.push(s.slice(i, i + size).trim()); continue; }
    cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter(Boolean);
}

/** Tail of a chunk used as overlap, cut at a word boundary. */
function tail(text, overlap) {
  if (!overlap || text.length <= overlap) return '';
  const t = text.slice(-overlap);
  const sp = t.indexOf(' ');
  return sp > 0 ? t.slice(sp + 1) : t;
}

/** Plain text → [{ content, tokenCount }] */
export function chunkText(text, { chunkSize = 1200, chunkOverlap = 200 } = {}) {
  const overlap = Math.min(chunkOverlap, Math.floor(chunkSize / 2));
  const paras = String(text).split(/\n{2,}/).map(p => p.replace(/\s+/g, ' ').trim()).filter(Boolean)
    .flatMap(p => (p.length > chunkSize ? splitLong(p, chunkSize - overlap) : [p]));
  const chunks = []; let cur = '';
  for (const p of paras) {
    if (cur && (cur + '\n\n' + p).length > chunkSize) {
      chunks.push(cur);
      const t = tail(cur, overlap);
      cur = t ? `${t}\n\n${p}` : p;
    } else cur = cur ? `${cur}\n\n${p}` : p;
  }
  if (cur.trim()) chunks.push(cur);
  return dedupe(chunks.map(c => c.trim()).filter(c => c.length > 0)).map(content => ({ content, tokenCount: estimateTokens(content) }));
}

/** PDF pages [{ page, text }] → chunks with pageNumber (a chunk never spans pages). */
export function chunkPages(pages, opts) {
  return pages.flatMap(p => chunkText(p.text, opts).map(c => ({ ...c, pageNumber: p.page })));
}

/** Transcript segments [{ text, start, duration }] (seconds) → chunks with start/end seconds. */
export function chunkSegments(segments, { chunkSize = 1200, chunkOverlap = 200 } = {}) {
  const chunks = []; let cur = [];
  const len = arr => arr.reduce((n, s) => n + s.text.length + 1, 0);
  const flush = () => {
    if (!cur.length) return;
    const content = cur.map(s => s.text).join(' ').replace(/\s+/g, ' ').trim();
    if (content) {
      const last = cur[cur.length - 1];
      chunks.push({ content, tokenCount: estimateTokens(content), startSeconds: Math.floor(cur[0].start), endSeconds: Math.ceil(last.start + (last.duration || 0)) });
    }
  };
  for (const seg of segments) {
    if (!seg.text?.trim()) continue;
    if (cur.length && len(cur) + seg.text.length > chunkSize) {
      flush();
      // overlap: carry trailing segments up to chunkOverlap characters
      const carry = []; let n = 0;
      for (let i = cur.length - 1; i >= 0 && n + cur[i].text.length <= chunkOverlap; i--) { carry.unshift(cur[i]); n += cur[i].text.length; }
      cur = carry;
    }
    cur.push(seg);
  }
  flush();
  return chunks;
}

function dedupe(arr) { const seen = new Set(); return arr.filter(c => (seen.has(c) ? false : (seen.add(c), true))); }

/** Normalise extracted text: unify line breaks, drop control chars, collapse blank runs. */
export function normalizeText(s) {
  // eslint-disable-next-line no-control-regex -- stripping control characters is intentional
  return String(s || '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[ \t\u00A0]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

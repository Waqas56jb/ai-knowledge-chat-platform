import { describe, it, expect } from 'vitest';
import { toCsv } from '../../src/utils/csv.js';
import { newToken, hashToken, safeErrorMessage, cleanText, safeFileName } from '../../src/utils/sanitize.js';
import { guardStatement, splitStatements } from '../../scripts/migrate.js';
import { detectDocumentType } from '../../src/services/document.service.js';
import { makePdf, makeDocx } from '../helpers/fixtures.js';

describe('CSV', () => {
  it('escapes commas, quotes and newlines', () => {
    const csv = toCsv([{ a: 'x,y', b: 'say "hi"', c: 'line1\nline2' }], [{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }, { key: 'c', label: 'C' }]);
    expect(csv).toBe('A,B,C\r\n"x,y","say ""hi""","line1\nline2"');
  });
  it('neutralises spreadsheet formulas', () => {
    expect(toCsv([{ a: '=HYPERLINK("http://x")' }], [{ key: 'a', label: 'A' }]).split('\r\n')[1]).toBe('"\'=HYPERLINK(""http://x"")"');
  });
});

describe('tokens and sanitising', () => {
  it('creates random tokens and stores only a hash', () => {
    const a = newToken(), b = newToken();
    expect(a.raw).not.toBe(b.raw);
    expect(a.raw.length).toBeGreaterThan(40);
    expect(a.hash).toBe(hashToken(a.raw));
    expect(a.hash).not.toContain(a.raw);
  });
  it('never returns secrets or SQL errors to clients', () => {
    expect(safeErrorMessage({ message: 'invalid key sk-abcdefghijklmnop1234' })).toBe('An unexpected error occurred.');
    expect(safeErrorMessage({ message: 'connect postgres://user:pw@host/db failed' })).toBe('An unexpected error occurred.');
    expect(safeErrorMessage({ code: '42P01', message: 'relation "x" does not exist' })).toBe('An unexpected error occurred.');
    expect(safeErrorMessage({ expose: true, message: 'Readable message.' })).toBe('Readable message.');
  });
  it('cleans text and file names', () => {
    expect(cleanText('a\u0007b\r\nc')).toBe('ab\nc');
    expect(safeFileName('../../etc/passwd')).not.toContain('/');
    expect(safeFileName('../../etc/passwd')).not.toMatch(/^\./);
  });
});

describe('document type detection (signature, not client MIME)', () => {
  it('accepts real PDF/DOCX/TXT and rejects spoofed files', () => {
    expect(detectDocumentType(makePdf(['hello']), 'a.pdf')).toBe('pdf');
    expect(detectDocumentType(makeDocx(['hello']), 'a.docx')).toBe('docx');
    expect(detectDocumentType(Buffer.from('plain text'), 'a.txt')).toBe('txt');
    expect(detectDocumentType(Buffer.from('# Title'), 'a.md')).toBe('markdown');
    expect(() => detectDocumentType(Buffer.from('MZ binary'), 'a.pdf')).toThrow();
    expect(() => detectDocumentType(Buffer.from([0, 1, 2, 3]), 'a.txt')).toThrow();
    expect(() => detectDocumentType(Buffer.from('x'), 'a.exe')).toThrow();
  });
});

describe('migration guard (shared database protection)', () => {
  it.each([
    'drop table public.chat_messages',
    'create table if not exists public.other_table (id int)',
    'alter table public.admin_settings enable row level security',
    'insert into public.nexpept_agents values (1)',
    'grant all on table public.chat_leads to anon',
    'truncate public.ai_knowledge_chat_profiles',
    'create role x',
    'do $$ begin perform 1; end $$',
    'create or replace function public.ai_knowledge_chat_f() returns void language sql as $$ delete from public.chat_messages $$',
    'create or replace function public.ai_knowledge_chat_g() returns int language sql security definer as $$ select 1 $$',
    'select * from storage.objects'
  ])('refuses %s', s => expect(() => guardStatement(s)).toThrow());

  it('allows prefixed objects and the vector extension', () => {
    expect(() => guardStatement('create table if not exists public.ai_knowledge_chat_x (id int)')).not.toThrow();
    expect(() => guardStatement('create extension if not exists vector with schema extensions')).not.toThrow();
    expect(() => guardStatement('create index if not exists ai_knowledge_chat_i on public.ai_knowledge_chat_x (id)')).not.toThrow();
  });

  it('splits statements without breaking function bodies', () => {
    expect(splitStatements("select 1; create function f() returns int language sql as $$ select 1; $$; -- c;\nselect 'a;b';")).toHaveLength(3);
  });
});

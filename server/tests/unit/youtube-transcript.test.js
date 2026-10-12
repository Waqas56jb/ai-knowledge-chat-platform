import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseYouTubeUrl, videoUrl } from '../../src/services/youtube.service.js';
import { parseManualTranscript, youtubePublicCaptions } from '../../src/services/transcript.service.js';

describe('YouTube URL parsing', () => {
  it.each([
    ['https://www.youtube.com/watch?v=qp0HIF3SfI4', 'qp0HIF3SfI4'],
    ['https://youtu.be/qp0HIF3SfI4?t=10', 'qp0HIF3SfI4'],
    ['https://m.youtube.com/watch?v=qp0HIF3SfI4&feature=share', 'qp0HIF3SfI4'],
    ['https://www.youtube.com/shorts/qp0HIF3SfI4', 'qp0HIF3SfI4'],
    ['https://www.youtube.com/embed/qp0HIF3SfI4', 'qp0HIF3SfI4']
  ])('video %s', (url, id) => { expect(parseYouTubeUrl(url)).toMatchObject({ kind: 'video', videoId: id }); });

  it('channel URLs', () => {
    expect(parseYouTubeUrl('https://www.youtube.com/channel/UC1234567890123456789012')).toMatchObject({ kind: 'channel', channelId: 'UC1234567890123456789012' });
    expect(parseYouTubeUrl('https://www.youtube.com/@TED')).toMatchObject({ kind: 'channel', handle: 'TED' });
  });

  it.each(['not a url', 'https://example.com/watch?v=qp0HIF3SfI4', 'https://www.youtube.com/watch?v=short', 'javascript:alert(1)', 'https://www.youtube.com/playlist?list=PL123'])('rejects %s', url => {
    expect(() => parseYouTubeUrl(url)).toThrow();
  });

  it('builds timestamped URLs only for valid seconds', () => {
    expect(videoUrl('qp0HIF3SfI4', 135.7)).toBe('https://www.youtube.com/watch?v=qp0HIF3SfI4&t=135s');
    expect(videoUrl('qp0HIF3SfI4', 0)).toBe('https://www.youtube.com/watch?v=qp0HIF3SfI4');
    expect(videoUrl('qp0HIF3SfI4', NaN)).toBe('https://www.youtube.com/watch?v=qp0HIF3SfI4');
  });
});

describe('manual transcript parsing', () => {
  it('reads timestamps and attaches untimed lines', () => {
    const t = parseManualTranscript('00:05 Hello there\ncontinued line\n[1:02:03] Later part\n2:10 - Dash style');
    expect(t.segments.map(s => s.start)).toEqual([5, 5, 3723, 130]);
    expect(t.hasTimestamps).toBe(true);
    expect(t.segments[0].duration).toBe(0);
  });
  it('works without timestamps', () => {
    const t = parseManualTranscript('line one\nline two');
    expect(t.segments).toHaveLength(2);
    expect(t.hasTimestamps).toBe(false);
  });
});

describe('YouTube caption provider error classification', () => {
  afterEach(() => vi.unstubAllGlobals());
  const player = playabilityStatus => vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ playabilityStatus }), { status: 200 })));
  it('a bot check (LOGIN_REQUIRED "not a bot") is transient, so the job retries later', async () => {
    player({ status: 'LOGIN_REQUIRED', reason: 'Sign in to confirm you’re not a bot' });
    await expect(youtubePublicCaptions.getTranscript('dQw4w9WgXcQ')).rejects.toMatchObject({ transient: true });
  });
  it('a private or unavailable video is permanent', async () => {
    player({ status: 'LOGIN_REQUIRED', reason: 'This video is private' });
    await expect(youtubePublicCaptions.getTranscript('dQw4w9WgXcQ')).rejects.toMatchObject({ permanent: true });
    player({ status: 'ERROR', reason: 'Video unavailable' });
    await expect(youtubePublicCaptions.getTranscript('dQw4w9WgXcQ')).rejects.toMatchObject({ permanent: true });
  });
});

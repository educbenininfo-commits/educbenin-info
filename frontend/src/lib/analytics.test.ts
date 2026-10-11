import { describe, expect, it } from 'vitest';
import {
  bucketLabel,
  bucketWindow,
  classifySource,
  deviceFromUA,
  isBot,
  isGranularity,
  isTrackablePath,
} from './analytics';

const CHROME_DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const CHROME_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const IPAD =
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/604.1';

describe('isBot', () => {
  it('flags crawlers, link previews and missing user agents', () => {
    expect(isBot('Googlebot/2.1 (+http://www.google.com/bot.html)')).toBe(true);
    expect(isBot('facebookexternalhit/1.1')).toBe(true);
    expect(isBot('WhatsApp/2.23.20.0')).toBe(true);
    expect(isBot('curl/8.4.0')).toBe(true);
    expect(isBot(null)).toBe(true);
  });
  it('lets real browsers through', () => {
    expect(isBot(CHROME_DESKTOP)).toBe(false);
    expect(isBot(CHROME_ANDROID)).toBe(false);
  });
});

describe('deviceFromUA', () => {
  it('classifies desktop, mobile and tablet', () => {
    expect(deviceFromUA(CHROME_DESKTOP)).toBe('desktop');
    expect(deviceFromUA(CHROME_ANDROID)).toBe('mobile');
    expect(deviceFromUA(IPAD)).toBe('tablet');
  });
});

describe('classifySource', () => {
  it('prefers utm_source, with aliases', () => {
    expect(classifySource('https://www.google.com/', 'fb', 'educbenin.info')).toBe('Facebook');
    expect(classifySource(null, 'Newsletter', 'educbenin.info')).toBe('newsletter');
  });
  it('maps known referrer hosts', () => {
    expect(classifySource('https://www.google.bj/', null, 'educbenin.info')).toBe('Google');
    expect(classifySource('https://l.facebook.com/l.php?u=x', null, null)).toBe('Facebook');
    expect(classifySource('https://wa.me/229', null, null)).toBe('WhatsApp');
  });
  it('treats no referrer, bad URLs and own-site referrers as direct', () => {
    expect(classifySource(undefined, undefined, 'educbenin.info')).toBe('Accès direct');
    expect(classifySource('not a url', null, null)).toBe('Accès direct');
    expect(classifySource('https://www.educbenin.info/fss', null, 'educbenin.info')).toBe(
      'Accès direct',
    );
  });
  it('falls back to the bare referrer host', () => {
    expect(classifySource('https://www.uac.bj/page', null, 'educbenin.info')).toBe('uac.bj');
  });
});

describe('isTrackablePath', () => {
  it('skips back-office, auth and API paths only', () => {
    expect(isTrackablePath('/')).toBe(true);
    expect(isTrackablePath('/fss/des')).toBe(true);
    expect(isTrackablePath('/administration')).toBe(true);
    expect(isTrackablePath('/admin')).toBe(false);
    expect(isTrackablePath('/admin/dossiers')).toBe(false);
    expect(isTrackablePath('/connexion')).toBe(false);
    expect(isTrackablePath('/api/track')).toBe(false);
  });
});

describe('isGranularity', () => {
  it('accepts only known granularities', () => {
    expect(isGranularity('minute')).toBe(true);
    expect(isGranularity('year')).toBe(true);
    expect(isGranularity('decade')).toBe(false);
    expect(isGranularity(undefined)).toBe(false);
  });
});

describe('bucketWindow (Bénin time, UTC+1)', () => {
  // 2026-10-11 23:30 UTC = 2026-10-12 00:30 in Porto-Novo.
  const now = new Date('2026-10-11T23:30:20Z');

  it('ends on the local bucket containing now, in order', () => {
    const { keys, startUtc } = bucketWindow('hour', now);
    expect(keys).toHaveLength(24);
    expect(keys.at(-1)).toBe('2026-10-12T00:00');
    expect(keys[0]).toBe('2026-10-11T01:00');
    expect(startUtc.toISOString()).toBe('2026-10-11T00:00:00.000Z');
  });

  it('builds day, minute and year windows', () => {
    expect(bucketWindow('day', now).keys.at(-1)).toBe('2026-10-12T00:00');
    expect(bucketWindow('day', now).keys[0]).toBe('2026-09-13T00:00');
    expect(bucketWindow('minute', now).keys.at(-1)).toBe('2026-10-12T00:30');
    expect(bucketWindow('year', now).keys).toEqual([
      '2022-01-01T00:00',
      '2023-01-01T00:00',
      '2024-01-01T00:00',
      '2025-01-01T00:00',
      '2026-01-01T00:00',
    ]);
  });

  it('starts weeks on Monday like Postgres date_trunc', () => {
    // 2026-10-12 is a Monday.
    expect(bucketWindow('week', now).keys.at(-1)).toBe('2026-10-12T00:00');
    expect(bucketWindow('week', new Date('2026-10-11T12:00:00Z')).keys.at(-1)).toBe(
      '2026-10-05T00:00',
    );
  });

  it('crosses month and year boundaries for months', () => {
    const { keys } = bucketWindow('month', now);
    expect(keys).toHaveLength(12);
    expect(keys[0]).toBe('2025-11-01T00:00');
    expect(keys.at(-1)).toBe('2026-10-01T00:00');
  });
});

describe('bucketLabel', () => {
  it('formats short French labels per granularity', () => {
    expect(bucketLabel('2026-10-12T14:05', 'minute')).toBe('14:05');
    expect(bucketLabel('2026-10-12T14:00', 'hour')).toBe('14 h');
    expect(bucketLabel('2026-09-12T00:00', 'day')).toBe('12 sept.');
    expect(bucketLabel('2026-09-01T00:00', 'month')).toBe('sept. 2026');
    expect(bucketLabel('2026-01-01T00:00', 'year')).toBe('2026');
  });
});

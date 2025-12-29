import { describe, expect, it } from '@jest/globals';
import { getClientIp, normalizeIp } from './request-ip';

describe('normalizeIp', () => {
  it('normalizes IPv4-mapped IPv6', () => {
    expect(normalizeIp('::ffff:127.0.0.1')).toBe('127.0.0.1');
    expect(normalizeIp('::FFFF:8.8.8.8')).toBe('8.8.8.8');
  });

  it('strips IPv4 port', () => {
    expect(normalizeIp('1.2.3.4:443')).toBe('1.2.3.4');
  });

  it('strips IPv6 brackets+port', () => {
    expect(normalizeIp('[2001:db8::1]:443')).toBe('2001:db8::1');
  });

  it('strips IPv6 zone id', () => {
    expect(normalizeIp('fe80::1%lo0')).toBe('fe80::1');
  });
});

describe('getClientIp', () => {
  it('prefers CF-Connecting-IP when behind trusted proxy', () => {
    expect(
      getClientIp({
        socket: { remoteAddress: '127.0.0.1' },
        headers: { 'cf-connecting-ip': '203.0.113.5' },
      }),
    ).toBe('203.0.113.5');
  });

  it('falls back to X-Forwarded-For when behind trusted proxy', () => {
    expect(
      getClientIp({
        socket: { remoteAddress: '127.0.0.1' },
        headers: { 'x-forwarded-for': '198.51.100.7, 10.0.0.1' },
      }),
    ).toBe('198.51.100.7');
  });

  it('does not trust forwarded headers when peer is public', () => {
    expect(
      getClientIp({
        socket: { remoteAddress: '8.8.8.8' },
        headers: { 'cf-connecting-ip': '203.0.113.5' },
      }),
    ).toBe('8.8.8.8');
  });
});

import { isIP } from 'node:net';

type HeaderValue = string | string[] | undefined;

export type RequestLike = {
  ip?: string;
  headers?: Record<string, HeaderValue>;
  socket?: { remoteAddress?: string | undefined } | undefined;
  connection?: { remoteAddress?: string | undefined } | undefined;
};

function firstHeader(headers: RequestLike['headers'], name: string): string {
  if (!headers) return '';
  const value = headers[name] ?? headers[name.toLowerCase()];
  if (!value) return '';
  if (Array.isArray(value)) return value[0] ?? '';
  return value;
}

function stripPortAndBrackets(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  // [2001:db8::1]:443
  const bracketMatch = trimmed.match(/^\[([^\]]+)\]:(\d+)$/);
  if (bracketMatch?.[1]) return bracketMatch[1];

  // 1.2.3.4:443
  const ipv4WithPort = trimmed.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (ipv4WithPort?.[1]) return ipv4WithPort[1];

  return trimmed;
}

export function normalizeIp(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim().replace(/^"+|"+$/g, '');
  if (!trimmed) return undefined;

  // Strip IPv6 zone id (e.g. fe80::1%lo0).
  const withoutZone = trimmed.split('%')[0] ?? '';
  const withoutPort = stripPortAndBrackets(withoutZone);

  // Normalize IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1).
  const mappedPrefix = '::ffff:';
  if (withoutPort.toLowerCase().startsWith(mappedPrefix)) {
    const v4 = withoutPort.slice(mappedPrefix.length);
    if (isIP(v4) === 4) return v4;
  }

  const ipKind = isIP(withoutPort);
  if (ipKind === 4 || ipKind === 6) return withoutPort;
  return undefined;
}

function isTrustedProxyRemoteAddress(ip: string | undefined): boolean {
  const normalized = normalizeIp(ip);
  if (!normalized) return false;

  if (isIP(normalized) === 4) {
    const [a, b] = normalized
      .split('.')
      .map((part) => Number.parseInt(part, 10));
    if (a === 127) return true;
    if (a === 10) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    return false;
  }

  const v = normalized.toLowerCase();
  if (v === '::1') return true;
  if (v.startsWith('fc') || v.startsWith('fd')) return true; // fc00::/7
  if (
    v.startsWith('fe8') ||
    v.startsWith('fe9') ||
    v.startsWith('fea') ||
    v.startsWith('feb')
  ) {
    return true; // fe80::/10
  }
  return false;
}

function firstForwardedFor(value: string): string | undefined {
  if (!value) return undefined;
  const first = value.split(',')[0]?.trim() ?? '';
  return normalizeIp(first);
}

/**
 * Extract a "real client IP" safely for logging/auditing.
 *
 * Security model:
 * - Only trust forwarding headers when the direct peer is a trusted proxy hop
 *   (loopback/private addresses), e.g. Caddy reverse proxy on the same host.
 * - Prefer Cloudflare's `CF-Connecting-IP` when present, otherwise XFF/X-Real-IP.
 */
export function getClientIp(req: RequestLike): string | undefined {
  const peerIp =
    req.socket?.remoteAddress ?? req.connection?.remoteAddress ?? undefined;

  const trustForwardedHeaders = isTrustedProxyRemoteAddress(peerIp);

  if (trustForwardedHeaders) {
    const cfConnectingIp = normalizeIp(
      firstHeader(req.headers, 'cf-connecting-ip'),
    );
    if (cfConnectingIp) return cfConnectingIp;

    const forwardedFor = firstForwardedFor(
      firstHeader(req.headers, 'x-forwarded-for'),
    );
    if (forwardedFor) return forwardedFor;

    const realIp = normalizeIp(firstHeader(req.headers, 'x-real-ip'));
    if (realIp) return realIp;
  }

  return normalizeIp(peerIp) ?? normalizeIp(req.ip) ?? undefined;
}

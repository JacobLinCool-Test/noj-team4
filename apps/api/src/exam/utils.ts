import type { Request } from 'express';
import { randomBytes } from 'crypto';

// 排除容易混淆的字元 (O, 0, 1, I)
const EXAM_ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const EXAM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * 生成考試 ID (10 字元)
 */
export function generateExamId(): string {
  let result = '';
  const bytes = randomBytes(10);
  for (let i = 0; i < 10; i++) {
    result += EXAM_ID_CHARS[bytes[i] % EXAM_ID_CHARS.length];
  }
  return result;
}

/**
 * 生成考試登入代碼 (6 字元)
 */
export function generateExamCode(): string {
  let result = '';
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    result += EXAM_CODE_CHARS[bytes[i] % EXAM_CODE_CHARS.length];
  }
  return result;
}

/**
 * 驗證 CIDR 格式
 */
export function isValidCidr(cidr: string): boolean {
  // 允許單一 IP 或 CIDR 格式
  const cidrRegex =
    /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;

  if (!cidrRegex.test(cidr)) {
    return false;
  }

  const parts = cidr.split('/');
  const ip = parts[0];
  const prefix = parts[1] ? parseInt(parts[1], 10) : 32;

  // 驗證 IP 各部分
  const octets = ip.split('.').map(Number);
  if (octets.some((o) => o < 0 || o > 255)) {
    return false;
  }

  // 驗證 prefix
  if (prefix < 0 || prefix > 32) {
    return false;
  }

  return true;
}

/**
 * 將 IP 轉為數字
 */
function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number);
  return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
}

/**
 * 檢查 IP 是否在 CIDR 範圍內
 */
function isIpInCidr(ip: string, cidr: string): boolean {
  const parts = cidr.split('/');
  const cidrIp = parts[0];
  const prefix = parts[1] ? parseInt(parts[1], 10) : 32;

  const ipNum = ipToNumber(ip);
  const cidrNum = ipToNumber(cidrIp);
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;

  return (ipNum & mask) === (cidrNum & mask);
}

/**
 * 檢查 IP 是否在允許列表中
 * 如果列表為空，允許所有 IP
 */
export function isIpAllowed(clientIp: string, allowList: string[]): boolean {
  // 空列表表示允許所有 IP
  if (!allowList || allowList.length === 0) {
    return true;
  }

  // 處理 IPv6 loopback 和 IPv4-mapped IPv6
  let normalizedIp = clientIp;
  if (clientIp === '::1') {
    normalizedIp = '127.0.0.1';
  } else if (clientIp.startsWith('::ffff:')) {
    normalizedIp = clientIp.substring(7);
  }

  // 檢查每個 CIDR
  for (const cidr of allowList) {
    if (isIpInCidr(normalizedIp, cidr)) {
      return true;
    }
  }

  return false;
}

/**
 * 從請求中取得客戶端 IP
 */
export function getClientIp(req: Request): string {
  // 先檢查 X-Forwarded-For (Cloudflare, 反向代理)
  const xff = req.headers['x-forwarded-for'];
  if (xff) {
    const ips = (Array.isArray(xff) ? xff[0] : xff).split(',');
    return ips[0].trim();
  }

  // 檢查 CF-Connecting-IP (Cloudflare 特定)
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp) {
    return Array.isArray(cfIp) ? cfIp[0] : cfIp;
  }

  // 檢查 X-Real-IP (nginx)
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  // 使用 socket 的 remote address
  return req.socket?.remoteAddress || req.ip || '0.0.0.0';
}

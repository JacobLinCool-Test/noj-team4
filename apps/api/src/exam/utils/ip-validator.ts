/**
 * IP 驗證工具
 * 支援 CIDR 格式的 IP 白名單驗證
 */

/**
 * 將 IP 位址轉換為數字（用於比對）
 */
function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return -1;
  }
  return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
}

/**
 * 解析 CIDR 格式的 IP 範圍
 * @param cidr 例如 "140.114.0.0/16" 或 "192.168.1.100"（單一 IP）
 * @returns [起始 IP, 結束 IP] 的數字表示，或 null（格式錯誤）
 */
function parseCidr(cidr: string): [number, number] | null {
  const [ip, maskStr] = cidr.split('/');
  const ipNum = ipToNumber(ip);

  if (ipNum === -1) {
    return null;
  }

  if (!maskStr) {
    // 單一 IP，視為 /32
    return [ipNum, ipNum];
  }

  const mask = parseInt(maskStr, 10);
  if (isNaN(mask) || mask < 0 || mask > 32) {
    return null;
  }

  // 計算網路遮罩
  const netmask = mask === 0 ? 0 : ~((1 << (32 - mask)) - 1);
  const start = ipNum & netmask;
  const end = start | ~netmask;

  return [start >>> 0, end >>> 0]; // 使用 >>> 0 確保是無符號整數
}

/**
 * 檢查 IP 是否在指定的 CIDR 範圍內
 */
function isIpInCidr(ip: string, cidr: string): boolean {
  const ipNum = ipToNumber(ip);
  if (ipNum === -1) {
    return false;
  }

  const range = parseCidr(cidr);
  if (!range) {
    return false;
  }

  const [start, end] = range;
  const ipUnsigned = ipNum >>> 0;

  return ipUnsigned >= start && ipUnsigned <= end;
}

/**
 * 檢查 IP 是否在白名單中
 * @param ip 要檢查的 IP 位址
 * @param allowList CIDR 格式的白名單陣列，空陣列表示允許所有 IP
 * @returns 是否允許
 */
export function isIpAllowed(ip: string, allowList: string[]): boolean {
  // 空白名單表示不限制
  if (allowList.length === 0) {
    return true;
  }

  // 處理 IPv6 localhost
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    ip = '127.0.0.1';
  }

  // 處理 IPv6 mapped IPv4
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  return allowList.some((cidr) => isIpInCidr(ip, cidr));
}

/**
 * 驗證 CIDR 格式是否正確
 */
export function isValidCidr(cidr: string): boolean {
  return parseCidr(cidr) !== null;
}

/**
 * 從請求中提取客戶端 IP
 * 優先使用 Cloudflare 的 CF-Connecting-IP header
 */
export function getClientIp(request: {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
}): string {
  // Cloudflare 的真實 IP header
  const cfIp = request.headers['cf-connecting-ip'];
  if (cfIp) {
    return Array.isArray(cfIp) ? cfIp[0] : cfIp;
  }

  // X-Forwarded-For header（由 Caddy 設定）
  const xff = request.headers['x-forwarded-for'];
  if (xff) {
    const ips = (Array.isArray(xff) ? xff[0] : xff).split(',');
    return ips[0].trim();
  }

  // X-Real-IP header
  const realIp = request.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  // 直接連線的 IP
  return request.ip || request.socket?.remoteAddress || '0.0.0.0';
}

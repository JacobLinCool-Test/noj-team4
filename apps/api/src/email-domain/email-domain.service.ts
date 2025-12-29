import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailDomainService implements OnModuleInit {
  private readonly logger = new Logger(EmailDomainService.name);

  /** Disposable email blocklist loaded from file (read-only, ~5000 domains) */
  private disposableBlocklist: Set<string> = new Set();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.loadDisposableBlocklist();
  }

  /**
   * Load the disposable email blocklist from file into memory.
   * This is loaded once on startup for fast lookup.
   */
  private async loadDisposableBlocklist(): Promise<void> {
    // Use process.cwd() which is the apps/api directory when running the server
    // __dirname points to dist/email-domain after compilation, which breaks the path
    const blocklistPath = path.join(
      process.cwd(),
      'data/disposable_email_blocklist.conf',
    );

    try {
      const content = fs.readFileSync(blocklistPath, 'utf-8');
      const domains = content
        .split('\n')
        .map((line) => line.trim().toLowerCase())
        .filter((line) => line && !line.startsWith('#'));

      this.disposableBlocklist = new Set(domains);
      this.logger.log(
        `Loaded ${this.disposableBlocklist.size} disposable email domains`,
      );
    } catch (error) {
      this.logger.warn(
        `Could not load disposable email blocklist: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  /**
   * Extract domain from an email address.
   */
  private extractDomain(email: string): string {
    const parts = email.toLowerCase().split('@');
    return parts.length === 2 ? parts[1] : '';
  }

  /**
   * Check if a domain matches an allowed pattern.
   * Supports exact match (gmail.com) and suffix patterns (*.edu.tw).
   */
  private matchesPattern(domain: string, pattern: string): boolean {
    if (pattern.startsWith('*.')) {
      const suffix = pattern.slice(1); // Remove '*', keep '.edu.tw'
      return domain.endsWith(suffix) || domain === pattern.slice(2);
    }
    return domain === pattern;
  }

  /**
   * Check if an email address is allowed for registration.
   *
   * Logic:
   * 1. Extract domain from email
   * 2. Check if domain is in the database allowlist (whitelist) - if yes, ALLOW
   * 3. Check if domain is in the database blocklist (custom blacklist) - if yes, BLOCK
   * 4. Check if domain is in the disposable email file blocklist - if yes, BLOCK
   * 5. If not in any list, BLOCK (whitelist-only mode)
   *
   * @returns { allowed: boolean; reason?: string }
   */
  async isEmailAllowed(
    email: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const domain = this.extractDomain(email);

    if (!domain) {
      return { allowed: false, reason: 'INVALID_EMAIL_FORMAT' };
    }

    // Step 1: Check database allowlist (enabled domains only)
    const allowedDomains = await this.prisma.allowedEmailDomain.findMany({
      where: { enabled: true },
      select: { domain: true },
    });

    for (const { domain: pattern } of allowedDomains) {
      if (this.matchesPattern(domain, pattern)) {
        return { allowed: true };
      }
    }

    // Step 2: Check database blocklist (enabled domains only)
    const blockedDomain = await this.prisma.blockedEmailDomain.findFirst({
      where: {
        domain: domain,
        enabled: true,
      },
    });

    if (blockedDomain) {
      return { allowed: false, reason: 'EMAIL_DOMAIN_BLOCKED' };
    }

    // Step 3: Check disposable email file blocklist
    if (this.disposableBlocklist.has(domain)) {
      return { allowed: false, reason: 'DISPOSABLE_EMAIL_BLOCKED' };
    }

    // Step 4: If not in allowlist, block (whitelist-only mode)
    return { allowed: false, reason: 'EMAIL_DOMAIN_NOT_ALLOWED' };
  }

  // =========================================================================
  // Admin CRUD for AllowedEmailDomain
  // =========================================================================

  async listAllowedDomains(params: { page?: number; limit?: number }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const [domains, total] = await Promise.all([
      this.prisma.allowedEmailDomain.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.allowedEmailDomain.count(),
    ]);

    return {
      domains,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async createAllowedDomain(data: { domain: string; note?: string }) {
    const domain = data.domain.toLowerCase().trim();
    return this.prisma.allowedEmailDomain.create({
      data: {
        domain,
        note: data.note?.trim() || null,
        enabled: true,
      },
    });
  }

  async updateAllowedDomain(
    id: number,
    data: { domain?: string; note?: string; enabled?: boolean },
  ) {
    return this.prisma.allowedEmailDomain.update({
      where: { id },
      data: {
        ...(data.domain !== undefined && {
          domain: data.domain.toLowerCase().trim(),
        }),
        ...(data.note !== undefined && { note: data.note?.trim() || null }),
        ...(data.enabled !== undefined && { enabled: data.enabled }),
      },
    });
  }

  async deleteAllowedDomain(id: number) {
    return this.prisma.allowedEmailDomain.delete({
      where: { id },
    });
  }

  // =========================================================================
  // Admin CRUD for BlockedEmailDomain
  // =========================================================================

  async listBlockedDomains(params: { page?: number; limit?: number }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const [domains, total] = await Promise.all([
      this.prisma.blockedEmailDomain.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.blockedEmailDomain.count(),
    ]);

    return {
      domains,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async createBlockedDomain(data: { domain: string; note?: string }) {
    const domain = data.domain.toLowerCase().trim();
    return this.prisma.blockedEmailDomain.create({
      data: {
        domain,
        note: data.note?.trim() || null,
        enabled: true,
      },
    });
  }

  async updateBlockedDomain(
    id: number,
    data: { domain?: string; note?: string; enabled?: boolean },
  ) {
    return this.prisma.blockedEmailDomain.update({
      where: { id },
      data: {
        ...(data.domain !== undefined && {
          domain: data.domain.toLowerCase().trim(),
        }),
        ...(data.note !== undefined && { note: data.note?.trim() || null }),
        ...(data.enabled !== undefined && { enabled: data.enabled }),
      },
    });
  }

  async deleteBlockedDomain(id: number) {
    return this.prisma.blockedEmailDomain.delete({
      where: { id },
    });
  }

  // =========================================================================
  // Utility: Get blocklist file stats
  // =========================================================================

  getDisposableBlocklistStats() {
    return {
      count: this.disposableBlocklist.size,
    };
  }

  /**
   * Check if a specific domain is in the disposable blocklist file.
   * Useful for admin UI to show why a domain is blocked.
   */
  isInDisposableBlocklist(domain: string): boolean {
    return this.disposableBlocklist.has(domain.toLowerCase());
  }
}

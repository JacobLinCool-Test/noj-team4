import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  AuditAction,
  AuditResult,
  EmailSendType,
  Prisma,
  User,
  UserRole,
  UserStatus,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, createHmac, randomBytes } from 'crypto';
import { Logger } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { EmailRateLimiterService } from '../mail/email-rate-limiter.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtPayload } from './types/jwt-payload';
import {
  UserPreferencesDto,
  DEFAULT_PREFERENCES,
} from '../user/dto/user-preferences.dto';
import { EmailDomainService } from '../email-domain/email-domain.service';
import { SystemConfigService } from '../system-config/system-config.service';

type RequestMeta = {
  ip?: string;
  userAgent?: string;
  locale?: 'zh-TW' | 'en';
};

type Locale = 'zh-TW' | 'en';

type AuthErrorCode =
  | 'USERNAME_OR_EMAIL_TAKEN'
  | 'INVALID_CREDENTIALS'
  | 'USER_DISABLED'
  | 'EMAIL_NOT_VERIFIED'
  | 'MISSING_REFRESH_TOKEN'
  | 'INVALID_REFRESH_TOKEN'
  | 'USER_NOT_FOUND_OR_DISABLED'
  | 'INVALID_VERIFICATION_TOKEN'
  | 'IDENTIFIER_REQUIRED'
  | 'USER_NOT_FOUND'
  | 'INVALID_PASSWORD_RESET_TOKEN'
  | 'EMAIL_DOMAIN_NOT_ALLOWED'
  | 'REGISTRATION_DISABLED';

type AuthResponse = {
  user: PublicUser;
  accessToken: string;
};

type PublicUser = {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  preferences: UserPreferencesDto;
};

@Injectable()
export class AuthService {
  private readonly refreshCookieName = 'noj_rt';
  private readonly logger = new Logger(AuthService.name);
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlSeconds: number;
  private readonly emailVerifyTtlSeconds: number;
  private readonly passwordResetTtlSeconds: number;
  private readonly webUrl: string;
  private readonly cookiePath: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly emailRateLimiter: EmailRateLimiterService,
    private readonly emailDomainService: EmailDomainService,
    private readonly systemConfigService: SystemConfigService,
  ) {
    this.accessTtlSeconds = this.parseTtlSeconds(
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN'),
      15 * 60,
    );
    this.refreshTtlSeconds = this.parseTtlSeconds(
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
      60 * 60 * 24 * 7,
    );
    this.emailVerifyTtlSeconds = this.parseTtlSeconds(
      this.configService.get<string>('EMAIL_VERIFY_EXPIRES_IN'),
      60 * 60 * 24,
    );
    this.passwordResetTtlSeconds = this.parseTtlSeconds(
      this.configService.get<string>('PASSWORD_RESET_EXPIRES_IN'),
      60 * 15,
    );
    this.webUrl =
      this.configService.get<string>('WEB_ORIGIN') || 'http://localhost:3000';
    this.cookiePath =
      this.configService.get<string>('AUTH_COOKIE_PATH') || '/api/auth';
  }

  private buildErrorPayload(code: AuthErrorCode, locale?: Locale) {
    const normalizedLocale = this.normalizeLocale(locale);
    const messages: Record<AuthErrorCode, Record<Locale, string>> = {
      USERNAME_OR_EMAIL_TAKEN: {
        'zh-TW': '用戶名或 Email 已被使用，請改用另一組。',
        en: 'That username or email is already taken. Please choose another.',
      },
      INVALID_CREDENTIALS: {
        'zh-TW': '帳號或密碼不正確，請再試一次。',
        en: 'Incorrect username/email or password. Please try again.',
      },
      USER_DISABLED: {
        'zh-TW': '此帳號已被停用，如有問題請聯絡管理員。',
        en: 'This account has been disabled. Please contact an administrator.',
      },
      EMAIL_NOT_VERIFIED: {
        'zh-TW': '請先完成信箱驗證後再登入。',
        en: 'Please verify your email before signing in.',
      },
      MISSING_REFRESH_TOKEN: {
        'zh-TW': '找不到登入憑證，請重新登入。',
        en: 'Login session is missing. Please sign in again.',
      },
      INVALID_REFRESH_TOKEN: {
        'zh-TW': '登入憑證已失效，請重新登入。',
        en: 'Your session has expired. Please sign in again.',
      },
      USER_NOT_FOUND_OR_DISABLED: {
        'zh-TW': '帳號不存在或已被停用，請重新登入。',
        en: 'Account not found or disabled. Please sign in again.',
      },
      INVALID_VERIFICATION_TOKEN: {
        'zh-TW': '驗證連結已失效或錯誤，請重新寄送驗證信。',
        en: 'The verification link is invalid or expired. Please request a new email.',
      },
      IDENTIFIER_REQUIRED: {
        'zh-TW': '請輸入帳號或 Email。',
        en: 'Please provide a username or email.',
      },
      USER_NOT_FOUND: {
        'zh-TW': '找不到使用者資料。',
        en: 'User not found.',
      },
      INVALID_PASSWORD_RESET_TOKEN: {
        'zh-TW': '密碼重設連結已失效或錯誤，請重新申請。',
        en: 'The password reset link is invalid or expired. Please request a new one.',
      },
      EMAIL_DOMAIN_NOT_ALLOWED: {
        'zh-TW': '此 Email 網域不被允許註冊。請使用常見的電子郵件服務（如 Gmail、Outlook）或教育機構信箱。',
        en: 'This email domain is not allowed for registration. Please use a common email provider (e.g., Gmail, Outlook) or an educational institution email.',
      },
      REGISTRATION_DISABLED: {
        'zh-TW': '目前暫停開放註冊，請稍後再試。',
        en: 'Registration is temporarily disabled. Please try again later.',
      },
    };

    const fallback =
      normalizedLocale === 'zh-TW'
        ? '發生錯誤，請稍後再試。'
        : 'Something went wrong. Please try again.';

    return {
      code,
      message: messages[code]?.[normalizedLocale] ?? fallback,
    };
  }

  private normalizeLocale(locale?: Locale): Locale {
    return locale === 'zh-TW' ? 'zh-TW' : 'en';
  }

  getRefreshCookieName() {
    return this.refreshCookieName;
  }

  getRefreshCookieMaxAge() {
    return this.refreshTtlSeconds * 1000;
  }

  getRefreshCookieOptions() {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: this.cookiePath,
      maxAge: this.getRefreshCookieMaxAge(),
    };
  }

  getRefreshCookiePath() {
    return this.cookiePath;
  }

  async register(
    dto: RegisterDto,
    meta: RequestMeta,
  ): Promise<AuthResponse & { refreshToken: string }> {
    // Check if registration is enabled
    const registrationEnabled =
      await this.systemConfigService.isRegistrationEnabled();
    if (!registrationEnabled) {
      throw new ServiceUnavailableException(
        this.buildErrorPayload('REGISTRATION_DISABLED', meta.locale),
      );
    }

    // Check if email domain is allowed
    const emailCheck = await this.emailDomainService.isEmailAllowed(dto.email);
    if (!emailCheck.allowed) {
      throw new BadRequestException(
        this.buildErrorPayload('EMAIL_DOMAIN_NOT_ALLOWED', meta.locale),
      );
    }

    const trimmedUsername = dto.username.trim();
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email.toLowerCase() }, { username: trimmedUsername }],
      },
    });
    if (existing) {
      throw new BadRequestException(
        this.buildErrorPayload('USERNAME_OR_EMAIL_TAKEN', meta.locale),
      );
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        username: trimmedUsername,
        email: dto.email.toLowerCase(),
        passwordHash,
      },
    });

    await this.logAudit({
      action: AuditAction.REGISTER,
      userId: user.id,
      result: AuditResult.SUCCESS,
      meta,
    });

    await this.sendVerificationEmailSafe(user, meta);

    return this.buildAuthResponse(user, meta);
  }

  async login(
    dto: LoginDto,
    meta: RequestMeta,
  ): Promise<AuthResponse & { refreshToken: string }> {
    const identifier = dto.identifier.trim();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: identifier }, { email: identifier.toLowerCase() }],
      },
    });

    if (!user) {
      await this.logAudit({
        action: AuditAction.LOGIN,
        userId: null,
        result: AuditResult.FAILURE,
        meta,
      });
      throw new UnauthorizedException(
        this.buildErrorPayload('INVALID_CREDENTIALS', meta.locale),
      );
    }

    if (user.status === UserStatus.DISABLED) {
      await this.logAudit({
        action: AuditAction.LOGIN,
        userId: user.id,
        result: AuditResult.FAILURE,
        meta,
      });
      throw new ForbiddenException(
        this.buildErrorPayload('USER_DISABLED', meta.locale),
      );
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      await this.logAudit({
        action: AuditAction.LOGIN,
        userId: user.id,
        result: AuditResult.FAILURE,
        meta,
      });
      throw new UnauthorizedException(
        this.buildErrorPayload('INVALID_CREDENTIALS', meta.locale),
      );
    }

    if (!user.emailVerifiedAt) {
      await this.sendVerificationEmailSafe(user, meta);
      await this.logAudit({
        action: AuditAction.LOGIN,
        userId: user.id,
        result: AuditResult.FAILURE,
        meta,
        detail: { reason: 'EMAIL_NOT_VERIFIED' },
      });
      throw new ForbiddenException(
        this.buildErrorPayload('EMAIL_NOT_VERIFIED', meta.locale),
      );
    }

    await this.logAudit({
      action: AuditAction.LOGIN,
      userId: user.id,
      result: AuditResult.SUCCESS,
      meta,
    });

    return this.buildAuthResponse(user, meta);
  }

  async refresh(
    refreshTokenRaw: string | undefined,
    meta: RequestMeta,
  ): Promise<AuthResponse & { refreshToken: string }> {
    if (!refreshTokenRaw) {
      throw new UnauthorizedException(
        this.buildErrorPayload('MISSING_REFRESH_TOKEN', meta.locale),
      );
    }

    const payload = await this.verifyRefreshToken(refreshTokenRaw);
    // NOTE: `tokenDigest` 欄位已加到 schema，但 Prisma client 尚未同步生成，
    // 先走相容路徑：以 userId 找出活躍 tokens 後逐一比對 hash。
    const activeRecords = await this.prisma.refreshToken.findMany({
      where: { userId: payload.sub, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    let tokenRecord = null as (typeof activeRecords)[number] | null;
    for (const record of activeRecords) {
      const matches = await argon2.verify(record.tokenHash, refreshTokenRaw);
      if (matches && record.expiresAt.getTime() >= Date.now()) {
        tokenRecord = record;
        break;
      }
    }

    if (!tokenRecord) {
      throw new UnauthorizedException(
        this.buildErrorPayload('INVALID_REFRESH_TOKEN', meta.locale),
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: tokenRecord.userId },
    });
    if (!user || user.status === UserStatus.DISABLED) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId: tokenRecord.userId },
      });
      throw new UnauthorizedException(
        this.buildErrorPayload('USER_NOT_FOUND_OR_DISABLED', meta.locale),
      );
    }

    if (!user.emailVerifiedAt) {
      throw new ForbiddenException(
        this.buildErrorPayload('EMAIL_NOT_VERIFIED', meta.locale),
      );
    }

    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    return this.buildAuthResponse(user, meta);
  }

  async logout(userId: number, meta: RequestMeta): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    await this.logAudit({
      action: AuditAction.LOGOUT,
      userId,
      result: AuditResult.SUCCESS,
      meta,
    });
  }

  async verifyEmail(
    dto: VerifyEmailDto,
    meta: RequestMeta,
  ): Promise<{ success: true }> {
    const token = dto.token.trim();
    const tokenHash = this.hashToken(token);
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });

    if (
      !record ||
      record.consumedAt ||
      record.expiresAt.getTime() < Date.now()
    ) {
      await this.logAudit({
        action: AuditAction.VERIFY_EMAIL,
        userId: record?.userId ?? null,
        result: AuditResult.FAILURE,
        meta,
        detail: { reason: 'INVALID_OR_EXPIRED_TOKEN' },
      });
      throw new UnauthorizedException(
        this.buildErrorPayload('INVALID_VERIFICATION_TOKEN', meta.locale),
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: record.userId },
    });
    if (!user) {
      throw new UnauthorizedException(
        this.buildErrorPayload('INVALID_VERIFICATION_TOKEN', meta.locale),
      );
    }

    const verifiedAt = user.emailVerifiedAt ?? new Date();

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.emailVerificationToken.deleteMany({
        where: { userId: record.userId, id: { not: record.id } },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: verifiedAt },
      }),
    ]);

    await this.logAudit({
      action: AuditAction.VERIFY_EMAIL,
      userId: record.userId,
      result: AuditResult.SUCCESS,
      meta,
    });

    return { success: true };
  }

  async resendVerification(
    dto: ResendVerificationDto,
    meta: RequestMeta,
  ): Promise<{ success: true }> {
    const identifier = dto.identifier?.trim();
    if (!identifier) {
      throw new BadRequestException(
        this.buildErrorPayload('IDENTIFIER_REQUIRED', meta.locale),
      );
    }

    const user = await this.findUserByIdentifier(identifier);
    if (!user || user.status === UserStatus.DISABLED || user.emailVerifiedAt) {
      return { success: true };
    }

    await this.sendVerificationEmailSafe(user, meta);

    await this.logAudit({
      action: AuditAction.RESEND_VERIFICATION_EMAIL,
      userId: user.id,
      result: AuditResult.SUCCESS,
      meta,
    });

    return { success: true };
  }

  async requestPasswordReset(
    dto: ForgotPasswordDto,
    meta: RequestMeta,
  ): Promise<{ success: true }> {
    const identifier = dto.identifier.trim();
    if (!identifier) {
      throw new BadRequestException(
        this.buildErrorPayload('IDENTIFIER_REQUIRED', meta.locale),
      );
    }

    const user = await this.findUserByIdentifier(identifier);
    if (!user || user.status === UserStatus.DISABLED) {
      await this.logAudit({
        action: AuditAction.REQUEST_PASSWORD_RESET,
        userId: user?.id ?? null,
        result: AuditResult.SUCCESS,
        meta,
        detail: { reason: user ? 'USER_DISABLED' : 'USER_NOT_FOUND' },
      });
      return { success: true };
    }

    await this.sendPasswordResetEmailSafe(user, meta);

    await this.logAudit({
      action: AuditAction.REQUEST_PASSWORD_RESET,
      userId: user.id,
      result: AuditResult.SUCCESS,
      meta,
    });

    return { success: true };
  }

  async resetPassword(
    dto: ResetPasswordDto,
    meta: RequestMeta,
  ): Promise<{ success: true }> {
    const tokenHash = this.hashToken(dto.token.trim());
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    const isExpired = record ? record.expiresAt.getTime() < Date.now() : false;
    if (!record || record.consumedAt || isExpired) {
      await this.logAudit({
        action: AuditAction.RESET_PASSWORD,
        userId: record?.userId ?? null,
        result: AuditResult.FAILURE,
        meta,
        detail: {
          reason: record
            ? record.consumedAt
              ? 'CONSUMED'
              : 'EXPIRED'
            : 'NOT_FOUND',
        },
      });
      throw new UnauthorizedException(
        this.buildErrorPayload('INVALID_PASSWORD_RESET_TOKEN', meta.locale),
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: record.userId },
    });
    if (!user || user.status === UserStatus.DISABLED) {
      await this.logAudit({
        action: AuditAction.RESET_PASSWORD,
        userId: record.userId,
        result: AuditResult.FAILURE,
        meta,
        detail: { reason: 'USER_NOT_FOUND_OR_DISABLED' },
      });
      throw new UnauthorizedException(
        this.buildErrorPayload('INVALID_PASSWORD_RESET_TOKEN', meta.locale),
      );
    }

    const passwordHash = await argon2.hash(dto.newPassword);
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { consumedAt: now },
      }),
      this.prisma.passwordResetToken.deleteMany({
        where: { userId: user.id, id: { not: record.id } },
      }),
    ]);

    await this.logAudit({
      action: AuditAction.RESET_PASSWORD,
      userId: user.id,
      result: AuditResult.SUCCESS,
      meta,
    });

    return { success: true };
  }

  async me(userId: number): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException(this.buildErrorPayload('USER_NOT_FOUND'));
    }
    return this.toPublicUser(user);
  }

  private async buildAuthResponse(
    user: User,
    meta: RequestMeta,
  ): Promise<AuthResponse & { refreshToken: string }> {
    const { accessToken, refreshToken } = await this.issueTokens(user, meta);
    return {
      user: this.toPublicUser(user),
      accessToken,
      refreshToken,
    };
  }

  private computeRefreshTokenDigest(token: string): string {
    return createHmac('sha256', this.getRefreshSecret())
      .update(token)
      .digest('hex');
  }

  private async issueTokens(
    user: User,
    meta: RequestMeta,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      username: user.username,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.getAccessSecret(),
      expiresIn: this.accessTtlSeconds,
    });

    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id },
      {
        secret: this.getRefreshSecret(),
        expiresIn: this.refreshTtlSeconds,
      },
    );

    await this.persistRefreshToken(refreshToken, user.id, meta);

    return { accessToken, refreshToken };
  }

  private async sendVerificationEmailSafe(user: User, meta: RequestMeta) {
    try {
      await this.sendVerificationEmail(user, meta);
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${user.email}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async sendVerificationEmail(user: User, meta: RequestMeta) {
    const allowed = await this.emailRateLimiter.shouldSend({
      type: 'verify_email',
      recipientEmail: user.email,
      ip: meta.ip,
    });
    if (!allowed) return;

    const token = await this.createEmailVerificationToken(user, meta);
    const verifyUrl = `${this.webUrl.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`;
    const expiresHours = Math.floor(this.emailVerifyTtlSeconds / 3600);

    const locale = meta.locale === 'zh-TW' ? 'zh-TW' : 'en';
    const { subject, text, html } = this.buildVerificationEmail(locale, {
      username: user.username,
      verifyUrl,
      expiresHours,
    });

    await this.mailService.sendMail({
      to: user.email,
      subject,
      text,
      html,
      type: EmailSendType.VERIFY_EMAIL,
      userId: user.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  }

  private async sendPasswordResetEmailSafe(user: User, meta: RequestMeta) {
    try {
      await this.sendPasswordResetEmail(user, meta);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${user.email}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async sendPasswordResetEmail(user: User, meta: RequestMeta) {
    const allowed = await this.emailRateLimiter.shouldSend({
      type: 'password_reset',
      recipientEmail: user.email,
      ip: meta.ip,
    });
    if (!allowed) return;

    const token = await this.createPasswordResetToken(user, meta);
    const resetUrl = `${this.webUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
    const expiresMinutes = Math.floor(this.passwordResetTtlSeconds / 60);
    const locale = meta.locale === 'zh-TW' ? 'zh-TW' : 'en';
    const { subject, text, html } = this.buildPasswordResetEmail(locale, {
      username: user.username,
      resetUrl,
      expiresMinutes,
    });

    await this.mailService.sendMail({
      to: user.email,
      subject,
      text,
      html,
      type: EmailSendType.PASSWORD_RESET,
      userId: user.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  }

  private async createEmailVerificationToken(
    user: User,
    meta: RequestMeta,
  ): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);

    // Use transaction to prevent race condition when creating verification token
    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.deleteMany({
        where: { userId: user.id },
      }),
      this.prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + this.emailVerifyTtlSeconds * 1000),
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      }),
    ]);

    return token;
  }

  private async createPasswordResetToken(
    user: User,
    meta: RequestMeta,
  ): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);

    // Use transaction to prevent race condition when creating password reset token
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      }),
      this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + this.passwordResetTtlSeconds * 1000),
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      }),
    ]);

    return token;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private buildVerificationEmail(
    locale: 'zh-TW' | 'en',
    params: { username: string; verifyUrl: string; expiresHours: number },
  ) {
    const { username, verifyUrl, expiresHours } = params;
    if (locale === 'zh-TW') {
      const subject = '【NOJ Team4】請完成信箱驗證';
      const text = [
        `嗨 ${username}，`,
        '',
        '歡迎使用 NOJ 線上解題系統！',
        `請在 ${expiresHours} 小時內點擊下方連結，完成信箱驗證：`,
        '',
        verifyUrl,
        '',
        'NOJ Team4',
      ].join('\n');
      const html = [
        `<p>嗨 ${username}，</p>`,
        `<p>歡迎使用 NOJ 線上解題系統！</p>`,
        `<p>請在 ${expiresHours} 小時內點擊下方連結，完成信箱驗證：</p>`,
        `<p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
        `<p>NOJ Team4</p>`,
      ].join('');
      return { subject, text, html };
    }

    const subject = '[NOJ Team4] Please verify your email';
    const text = [
      `Hi ${username},`,
      '',
      'Welcome to NOJ Team4!',
      `Please click the link within ${expiresHours} hours to verify your email:`,
      '',
      verifyUrl,
      '',
      'NOJ Team4',
    ].join('\n');
    const html = [
      `<p>Hi ${username},</p>`,
      `<p>Welcome to NOJ Team4!</p>`,
      `<p>Please click the link within ${expiresHours} hours to verify your email:</p>`,
      `<p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
      `<p>NOJ Team4</p>`,
    ].join('');
    return { subject, text, html };
  }

  private buildPasswordResetEmail(
    locale: 'zh-TW' | 'en',
    params: { username: string; resetUrl: string; expiresMinutes: number },
  ) {
    const { username, resetUrl, expiresMinutes } = params;
    if (locale === 'zh-TW') {
      const subject = '【NOJ Team4】重設密碼連結';
      const text = [
        `嗨 ${username}，`,
        '',
        '您剛才請求重設密碼，如果是您本人操作，請在期限內點擊以下連結：',
        '',
        resetUrl,
        '',
        `此連結 ${expiresMinutes} 分鐘後失效，若非您本人操作，請忽略本信。`,
        '',
        'NOJ Team4',
      ].join('\n');
      const html = [
        `<p>嗨 ${username}，</p>`,
        '<p>您剛才請求重設密碼，如果是您本人操作，請在期限內點擊以下連結：</p>',
        `<p><a href="${resetUrl}">${resetUrl}</a></p>`,
        `<p>此連結 ${expiresMinutes} 分鐘後失效，若非您本人操作，請忽略本信。</p>`,
        '<p>NOJ Team4</p>',
      ].join('');
      return { subject, text, html };
    }

    const subject = '[NOJ Team4] Password reset link';
    const text = [
      `Hi ${username},`,
      '',
      'We received a request to reset your password. If this was you, please click the link below:',
      '',
      resetUrl,
      '',
      `This link expires in ${expiresMinutes} minutes. If you did not request it, you can ignore this email.`,
      '',
      'NOJ Team4',
    ].join('\n');
    const html = [
      `<p>Hi ${username},</p>`,
      '<p>We received a request to reset your password. If this was you, please click the link below:</p>',
      `<p><a href="${resetUrl}">${resetUrl}</a></p>`,
      `<p>This link expires in ${expiresMinutes} minutes. If you did not request it, you can ignore this email.</p>`,
      '<p>NOJ Team4</p>',
    ].join('');
    return { subject, text, html };
  }

  private async findUserByIdentifier(identifier: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        OR: [{ username: identifier }, { email: identifier.toLowerCase() }],
      },
    });
  }

  private async persistRefreshToken(
    token: string,
    userId: number,
    meta: RequestMeta,
  ) {
    const hash = await argon2.hash(token);
    const now = new Date();
    const expiresAt = new Date(Date.now() + this.refreshTtlSeconds * 1000);

    // Use transaction to ensure atomicity and prevent race conditions
    await this.prisma.$transaction(async (tx) => {
      // Create new token
      await tx.refreshToken.create({
        data: {
          userId,
          tokenHash: hash,
          expiresAt,
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      });

      // Delete expired/revoked tokens
      await tx.refreshToken.deleteMany({
        where: {
          userId,
          OR: [{ expiresAt: { lt: now } }, { revokedAt: { not: null } }],
        },
      });

      // Query active tokens (excluding just-deleted ones)
      const activeTokens = await tx.refreshToken.findMany({
        where: { userId, revokedAt: null, expiresAt: { gte: now } },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });

      // Revoke oldest tokens if limit exceeded
      const maxActiveTokens = 5;
      if (activeTokens.length > maxActiveTokens) {
        const revokeIds = activeTokens
          .slice(0, activeTokens.length - maxActiveTokens)
          .map((t) => t.id);
        await tx.refreshToken.updateMany({
          where: { id: { in: revokeIds } },
          data: { revokedAt: now },
        });
      }
    });
  }

  private parseTtlSeconds(
    value: string | number | undefined,
    defaultValue: number,
  ): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return defaultValue;
  }

  private getAccessSecret() {
    const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is required but not set');
    }
    return secret;
  }

  private getRefreshSecret() {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is required but not set');
    }
    return secret;
  }

  private async verifyRefreshToken(token: string): Promise<{ sub: number }> {
    try {
      return await this.jwtService.verifyAsync<{ sub: number }>(token, {
        secret: this.getRefreshSecret(),
      });
    } catch (error) {
      throw new UnauthorizedException(
        this.buildErrorPayload('INVALID_REFRESH_TOKEN'),
      );
    }
  }

  private async logAudit(params: {
    action: AuditAction;
    userId: number | null;
    result: AuditResult;
    meta: RequestMeta;
    detail?: Prisma.InputJsonValue;
  }) {
    const { action, userId, result, meta, detail } = params;
    await this.prisma.auditLog.create({
      data: {
        action,
        userId: userId ?? undefined,
        result,
        ip: meta.ip,
        userAgent: meta.userAgent,
        detail,
      },
    });
  }

  private toPublicUser(user: User): PublicUser {
    const storedPrefs = (user.preferences as UserPreferencesDto) || {};
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt ?? null,
      avatarUrl: user.avatarUrl ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      preferences: {
        ...DEFAULT_PREFERENCES,
        ...storedPrefs,
      },
    };
  }
}

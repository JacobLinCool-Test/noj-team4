import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import type { JwtPayload } from './types/jwt-payload';
import { JwtOrApiTokenAuthGuard } from '../api-token/guards/jwt-or-api-token-auth.guard';
import { ScopesGuard } from '../api-token/guards/scopes.guard';
import { RequireScopes } from '../api-token/decorators/require-scopes.decorator';
import { TokenScope } from '@prisma/client';
import { getClientIp } from '../common/request-ip';
import { TurnstileService } from '../turnstile/turnstile.service';

type RequestWithCookies = Request & { cookies?: Record<string, string> };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly turnstileService: TurnstileService,
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60 } })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: RequestWithCookies,
    @Res({ passthrough: true }) res: Response,
  ) {
    const meta = this.extractMeta(req);

    // Verify Turnstile token
    if (this.turnstileService.isEnabled()) {
      const turnstileResult = await this.turnstileService.verify(
        dto.turnstileToken || '',
        meta.ip,
        'register',
      );
      if (!turnstileResult.success) {
        throw new BadRequestException({
          message: this.turnstileService.getErrorMessage(
            turnstileResult.errorCodes || [],
            meta.locale,
          ),
          code: 'TURNSTILE_VERIFICATION_FAILED',
        });
      }
    }

    const result = await this.authService.register(dto, meta);
    this.setRefreshCookie(res, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken };
  }

  @Throttle({ default: { limit: 10, ttl: 60 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: RequestWithCookies,
    @Res({ passthrough: true }) res: Response,
  ) {
    const meta = this.extractMeta(req);
    const result = await this.authService.login(dto, meta);
    this.setRefreshCookie(res, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken };
  }

  @Post('refresh')
  async refresh(
    @Req() req: RequestWithCookies,
    @Res({ passthrough: true }) res: Response,
  ) {
    const meta = this.extractMeta(req);
    const refreshToken = req.cookies?.[this.authService.getRefreshCookieName()];
    const result = await this.authService.refresh(refreshToken, meta);
    this.setRefreshCookie(res, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken };
  }

  @Throttle({ default: { limit: 5, ttl: 300 } })
  @Post('verify-email')
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Req() req: RequestWithCookies,
  ) {
    const meta = this.extractMeta(req);
    return this.authService.verifyEmail(dto, meta);
  }

  @Throttle({ default: { limit: 3, ttl: 600 } })
  @Post('resend-verification')
  async resendVerification(
    @Body() dto: ResendVerificationDto,
    @Req() req: RequestWithCookies,
  ) {
    const meta = this.extractMeta(req);
    return this.authService.resendVerification(dto, meta);
  }

  @Throttle({ default: { limit: 5, ttl: 900 } })
  @Post('forgot-password')
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() req: RequestWithCookies,
  ) {
    const meta = this.extractMeta(req);

    // Verify Turnstile token
    if (this.turnstileService.isEnabled()) {
      const turnstileResult = await this.turnstileService.verify(
        dto.turnstileToken || '',
        meta.ip,
        'forgot-password',
      );
      if (!turnstileResult.success) {
        throw new BadRequestException({
          message: this.turnstileService.getErrorMessage(
            turnstileResult.errorCodes || [],
            meta.locale,
          ),
          code: 'TURNSTILE_VERIFICATION_FAILED',
        });
      }
    }

    return this.authService.requestPasswordReset(dto, meta);
  }

  @Throttle({ default: { limit: 5, ttl: 900 } })
  @Post('reset-password')
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: RequestWithCookies,
    @Res({ passthrough: true }) res: Response,
  ) {
    const meta = this.extractMeta(req);
    const result = await this.authService.resetPassword(dto, meta);
    res.clearCookie(this.authService.getRefreshCookieName(), {
      path: this.authService.getRefreshCookiePath(),
    });
    return result;
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.READ_USER)
  @Get('me')
  async me(@CurrentUser() user: JwtPayload) {
    return this.authService.me(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @CurrentUser() user: JwtPayload,
    @Req() req: RequestWithCookies,
    @Res({ passthrough: true }) res: Response,
  ) {
    const meta = this.extractMeta(req);
    await this.authService.logout(user.sub, meta);
    res.clearCookie(this.authService.getRefreshCookieName(), {
      path: this.authService.getRefreshCookiePath(),
    });
    return { success: true };
  }

  private extractMeta(req: RequestWithCookies): {
    ip?: string;
    userAgent?: string;
    locale?: 'zh-TW' | 'en';
  } {
    return {
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'] || '',
      locale: this.detectLocale(req),
    };
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie(
      this.authService.getRefreshCookieName(),
      token,
      this.authService.getRefreshCookieOptions(),
    );
  }

  private detectLocale(req: RequestWithCookies): 'zh-TW' | 'en' {
    const headerLocaleRaw = req.headers['x-client-locale'];
    const headerLocale =
      typeof headerLocaleRaw === 'string'
        ? headerLocaleRaw
        : Array.isArray(headerLocaleRaw)
          ? headerLocaleRaw[0]
          : undefined;
    if (headerLocale) {
      const normalizedHeader = headerLocale.toLowerCase();
      if (normalizedHeader.startsWith('zh')) {
        return 'zh-TW';
      }
      if (normalizedHeader.startsWith('en')) {
        return 'en';
      }
    }

    const cookieLocale =
      (req.cookies?.locale as string | undefined) ||
      (req.cookies?.NEXT_LOCALE as string | undefined) ||
      (req.cookies?.i18next as string | undefined);
    const acceptLanguage =
      typeof req.headers['accept-language'] === 'string'
        ? req.headers['accept-language']
        : '';
    const normalized = (cookieLocale || acceptLanguage).toLowerCase();
    return normalized.startsWith('zh') ? 'zh-TW' : 'en';
  }
}

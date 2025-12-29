import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface TurnstileSiteverifyResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
  action?: string;
  cdata?: string;
}

export interface TurnstileVerifyResult {
  success: boolean;
  errorCodes?: string[];
  hostname?: string;
  action?: string;
}

@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);
  private readonly secretKey: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.secretKey = this.configService.get<string>('TURNSTILE_SECRET_KEY') || '';
    this.enabled = !!this.secretKey;

    if (!this.enabled) {
      this.logger.warn(
        'Turnstile is disabled: TURNSTILE_SECRET_KEY not configured',
      );
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async verify(
    token: string,
    remoteIp?: string,
    expectedAction?: string,
    expectedHostname?: string,
  ): Promise<TurnstileVerifyResult> {
    // If Turnstile is not configured, allow all requests (for development)
    if (!this.enabled) {
      this.logger.debug('Turnstile disabled, skipping verification');
      return { success: true };
    }

    if (!token) {
      return {
        success: false,
        errorCodes: ['missing-input-response'],
      };
    }

    try {
      const formData = new URLSearchParams();
      formData.append('secret', this.secretKey);
      formData.append('response', token);
      if (remoteIp) {
        formData.append('remoteip', remoteIp);
      }

      const response = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        },
      );

      if (!response.ok) {
        this.logger.error(
          `Turnstile API error: ${response.status} ${response.statusText}`,
        );
        return {
          success: false,
          errorCodes: ['internal-error'],
        };
      }

      const data: TurnstileSiteverifyResponse = await response.json();

      // Log for debugging (exclude sensitive data)
      this.logger.debug(
        `Turnstile verify result: success=${data.success}, hostname=${data.hostname}, action=${data.action}`,
      );

      if (!data.success) {
        this.logger.warn(
          `Turnstile verification failed: ${data['error-codes']?.join(', ') || 'unknown error'}`,
        );
        return {
          success: false,
          errorCodes: data['error-codes'] || [],
          hostname: data.hostname,
          action: data.action,
        };
      }

      // Enhanced validation: check hostname if expected
      if (expectedHostname && data.hostname !== expectedHostname) {
        this.logger.warn(
          `Turnstile hostname mismatch: expected=${expectedHostname}, got=${data.hostname}`,
        );
        return {
          success: false,
          errorCodes: ['hostname-mismatch'],
          hostname: data.hostname,
        };
      }

      // Enhanced validation: check action if expected
      if (expectedAction && data.action !== expectedAction) {
        this.logger.warn(
          `Turnstile action mismatch: expected=${expectedAction}, got=${data.action}`,
        );
        return {
          success: false,
          errorCodes: ['action-mismatch'],
          action: data.action,
        };
      }

      return {
        success: true,
        hostname: data.hostname,
        action: data.action,
      };
    } catch (error) {
      this.logger.error('Turnstile verification error:', error);
      return {
        success: false,
        errorCodes: ['internal-error'],
      };
    }
  }

  /**
   * Get user-friendly error message for Turnstile error codes
   */
  getErrorMessage(errorCodes: string[], locale: 'zh-TW' | 'en' = 'en'): string {
    const messages: Record<string, { en: string; 'zh-TW': string }> = {
      'missing-input-response': {
        en: 'Please complete the security verification',
        'zh-TW': '請完成安全驗證',
      },
      'invalid-input-response': {
        en: 'Security verification failed. Please try again',
        'zh-TW': '安全驗證失敗，請重試',
      },
      'timeout-or-duplicate': {
        en: 'Verification expired. Please refresh and try again',
        'zh-TW': '驗證已過期，請重新整理頁面後再試',
      },
      'hostname-mismatch': {
        en: 'Security verification failed',
        'zh-TW': '安全驗證失敗',
      },
      'action-mismatch': {
        en: 'Security verification failed',
        'zh-TW': '安全驗證失敗',
      },
      'internal-error': {
        en: 'Verification service temporarily unavailable',
        'zh-TW': '驗證服務暫時無法使用',
      },
    };

    // Return the first matching error message
    for (const code of errorCodes) {
      if (messages[code]) {
        return messages[code][locale];
      }
    }

    // Default message
    return locale === 'zh-TW'
      ? '安全驗證失敗，請重試'
      : 'Security verification failed. Please try again';
  }
}

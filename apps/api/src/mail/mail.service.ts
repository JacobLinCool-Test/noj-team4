import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { SystemConfigService } from '../system-config/system-config.service';
import { EmailSendStatus, EmailSendType } from '@prisma/client';

type MailOptions = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  type?: EmailSendType;
  userId?: number;
  ip?: string;
  userAgent?: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter?: Transporter | null;
  private readonly fromAddress: string | undefined;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly systemConfigService: SystemConfigService,
  ) {
    this.fromAddress = this.configService.get<string>('MAIL_FROM');
    this.initializeTransporter();
  }

  async sendMail(options: MailOptions) {
    // Check if email sending is enabled
    const emailSendingEnabled =
      await this.systemConfigService.isEmailSendingEnabled();
    if (!emailSendingEnabled) {
      this.logger.log(
        `Email sending disabled. Skipping mail to ${options.to} with subject "${options.subject}".`,
      );
      await this.logEmailSend({
        status: EmailSendStatus.SKIPPED,
        provider: 'disabled',
        error: 'EMAIL_SENDING_DISABLED',
        options,
      });
      return;
    }

    if (!this.transporter || !this.fromAddress) {
      this.logger.log(
        `Mail not configured. Pretend sending mail to ${options.to} with subject "${options.subject}".`,
      );
      this.logger.debug({
        to: options.to,
        subject: options.subject,
        text: '[redacted]',
        html: options.html ? '[redacted]' : undefined,
      });
      await this.logEmailSend({
        status: EmailSendStatus.SKIPPED,
        provider: 'console',
        options,
      });
      return;
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      await this.logEmailSend({
        status: EmailSendStatus.SENT,
        provider: 'smtp',
        messageId:
          typeof info?.messageId === 'string' ? info.messageId : undefined,
        options,
      });
    } catch (error) {
      await this.logEmailSend({
        status: EmailSendStatus.FAILED,
        provider: 'smtp',
        error:
          error instanceof Error
            ? `${error.name}: ${error.message}`
            : 'Unknown error',
        options,
      });
      throw error;
    }
  }

  private async logEmailSend(params: {
    status: EmailSendStatus;
    provider: string;
    messageId?: string;
    error?: string;
    options: MailOptions;
  }) {
    const normalizedEmail = params.options.to.trim().toLowerCase();
    if (!normalizedEmail) return;

    const type = params.options.type ?? EmailSendType.GENERIC;

    try {
      await this.prisma.emailSendLog.create({
        data: {
          type,
          status: params.status,
          recipientEmail: normalizedEmail,
          subject: params.options.subject,
          provider: params.provider,
          messageId: params.messageId,
          error: params.error,
          ip: params.options.ip,
          userAgent: params.options.userAgent,
          userId: params.options.userId,
        },
      });
    } catch (e) {
      // Avoid breaking auth flow just because logging fails.
      this.logger.warn(
        `Failed to write EmailSendLog: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  private initializeTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number.parseInt(
      this.configService.get<string>('SMTP_PORT') || '',
      10,
    );
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const secure = this.configService.get<string>('SMTP_SECURE') === 'true';

    if (!host || Number.isNaN(port) || !user || !pass || !this.fromAddress) {
      this.logger.warn(
        'SMTP is not fully configured. Falling back to console logger mailer.',
      );
      this.transporter = null;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }
}

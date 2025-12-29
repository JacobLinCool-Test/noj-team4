import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminOnlyGuard } from './admin-only.guard';
import { AdminService } from './admin.service';
import { AuditAction, AuditResult, UserRole, UserStatus } from '@prisma/client';
import { UpdateAllAiConfigsDto } from './dto/ai-feature-config.dto';
import {
  CreateEmailDomainDto,
  UpdateEmailDomainDto,
} from './dto/email-domain.dto';
import { UpdateSystemConfigDto } from '../system-config/dto/update-system-config.dto';
import { EmailDomainService } from '../email-domain/email-domain.service';
import { SystemConfigService } from '../system-config/system-config.service';
import { getClientIp } from '../common/request-ip';
import { BulkCreateUsersDto } from './dto/bulk-create-users.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { DemoDataService } from './demo-data/demo-data.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminOnlyGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly emailDomainService: EmailDomainService,
    private readonly systemConfigService: SystemConfigService,
    private readonly demoDataService: DemoDataService,
  ) {}

  @Get('users')
  async listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.listUsers({
      page: page ? Number.parseInt(page, 10) : undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
      search,
      role: this.parseUserRole(role),
      status: this.parseUserStatus(status),
    });
  }

  private parseUserRole(role?: string): UserRole | undefined {
    if (!role) return undefined;
    if (role === UserRole.ADMIN || role === UserRole.USER) {
      return role;
    }
    return undefined;
  }

  private parseUserStatus(status?: string): UserStatus | undefined {
    if (!status) return undefined;
    if (status === UserStatus.ACTIVE || status === UserStatus.DISABLED) {
      return status;
    }
    return undefined;
  }

  @Get('ai-configs')
  async getAiConfigs() {
    return this.adminService.getAiFeatureConfigs();
  }

  @Put('ai-configs')
  async updateAiConfigs(@Body() dto: UpdateAllAiConfigsDto) {
    return this.adminService.updateAiFeatureConfigs(dto);
  }

  // =========================================================================
  // System Config
  // =========================================================================

  @Get('system-config')
  async getSystemConfig() {
    const config = await this.systemConfigService.getConfig();
    const rateLimits = await this.systemConfigService.getEmailRateLimits();
    return { ...config, emailRateLimits: rateLimits };
  }

  @Put('system-config')
  async updateSystemConfig(
    @Body() dto: UpdateSystemConfigDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'];

    // Build update data, converting date strings to Date objects
    const updateData: Record<string, any> = {};

    if (dto.registrationEnabled !== undefined) {
      updateData.registrationEnabled = dto.registrationEnabled;
    }
    if (dto.registrationDisabledUntil !== undefined) {
      updateData.registrationDisabledUntil = dto.registrationDisabledUntil
        ? new Date(dto.registrationDisabledUntil)
        : null;
    }
    if (dto.emailSendingEnabled !== undefined) {
      updateData.emailSendingEnabled = dto.emailSendingEnabled;
    }
    if (dto.emailSendingDisabledUntil !== undefined) {
      updateData.emailSendingDisabledUntil = dto.emailSendingDisabledUntil
        ? new Date(dto.emailSendingDisabledUntil)
        : null;
    }

    // Rate limit fields
    if (dto.emailRlVerifyTtl !== undefined) {
      updateData.emailRlVerifyTtl = dto.emailRlVerifyTtl;
    }
    if (dto.emailRlVerifyToLimit !== undefined) {
      updateData.emailRlVerifyToLimit = dto.emailRlVerifyToLimit;
    }
    if (dto.emailRlVerifyIpLimit !== undefined) {
      updateData.emailRlVerifyIpLimit = dto.emailRlVerifyIpLimit;
    }
    if (dto.emailRlResetTtl !== undefined) {
      updateData.emailRlResetTtl = dto.emailRlResetTtl;
    }
    if (dto.emailRlResetToLimit !== undefined) {
      updateData.emailRlResetToLimit = dto.emailRlResetToLimit;
    }
    if (dto.emailRlResetIpLimit !== undefined) {
      updateData.emailRlResetIpLimit = dto.emailRlResetIpLimit;
    }
    if (dto.emailRlGlobalIpTtl !== undefined) {
      updateData.emailRlGlobalIpTtl = dto.emailRlGlobalIpTtl;
    }
    if (dto.emailRlGlobalIpLimit !== undefined) {
      updateData.emailRlGlobalIpLimit = dto.emailRlGlobalIpLimit;
    }

    const config = await this.systemConfigService.updateConfig(updateData);

    // Log the action
    await this.adminService.logAdminAction({
      adminId: user.sub,
      action: 'UPDATE_SYSTEM_CONFIG',
      targetType: 'SystemConfig',
      targetId: 1,
      details: updateData,
      ip,
      userAgent,
    });

    const rateLimits = await this.systemConfigService.getEmailRateLimits();
    return { ...config, emailRateLimits: rateLimits };
  }

  // =========================================================================
  // Pending Verification Users
  // =========================================================================

  @Get('users/pending-verification')
  async listPendingVerificationUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listPendingVerificationUsers({
      page: page ? Number.parseInt(page, 10) : undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
    });
  }

  @Post('users/:id/force-verify')
  async forceVerifyUser(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    const admin = (req as any).user;
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'];

    const user = await this.adminService.forceVerifyUser(id);

    // Log the action
    await this.adminService.logAdminAction({
      adminId: admin.sub,
      action: 'FORCE_VERIFY_USER',
      targetType: 'User',
      targetId: id,
      details: { username: user.username, email: user.email },
      ip,
      userAgent,
    });

    return user;
  }

  @Put('users/:id/status')
  async updateUserStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
    @Req() req: Request,
  ) {
    const admin = (req as any).user;
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'];

    // Cannot disable yourself
    if (admin.sub === id && dto.status === UserStatus.DISABLED) {
      throw new BadRequestException('CANNOT_DISABLE_SELF');
    }

    const user = await this.adminService.updateUserStatus(id, dto.status, dto.reason);

    // Log the action
    await this.adminService.logAdminAction({
      adminId: admin.sub,
      action: dto.status === UserStatus.DISABLED ? 'DISABLE_USER' : 'ENABLE_USER',
      targetType: 'User',
      targetId: id,
      details: { username: user.username, email: user.email, reason: dto.reason },
      ip,
      userAgent,
    });

    return user;
  }

  @Put('users/:id/role')
  async updateUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserRoleDto,
    @Req() req: Request,
  ) {
    const admin = (req as any).user;
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'];

    // Cannot change your own role
    if (admin.sub === id) {
      throw new BadRequestException('CANNOT_CHANGE_OWN_ROLE');
    }

    const user = await this.adminService.updateUserRole(id, dto.role);

    // Log the action
    await this.adminService.logAdminAction({
      adminId: admin.sub,
      action: 'CHANGE_USER_ROLE',
      targetType: 'User',
      targetId: id,
      details: { username: user.username, email: user.email, newRole: dto.role },
      ip,
      userAgent,
    });

    return user;
  }

  @Delete('users/:id')
  async deleteUser(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    const admin = (req as any).user;
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'];

    // Cannot delete yourself
    if (admin.sub === id) {
      throw new BadRequestException('CANNOT_DELETE_SELF');
    }

    const result = await this.adminService.deleteUser(id);

    // Log the action
    await this.adminService.logAdminAction({
      adminId: admin.sub,
      action: 'DELETE_USER',
      targetType: 'User',
      targetId: id,
      details: { username: result.username, email: result.email },
      ip,
      userAgent,
    });

    return result;
  }

  @Post('users/:id/force-logout')
  async forceLogoutUser(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    const admin = (req as any).user;
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'];

    const result = await this.adminService.forceLogoutUser(id);

    // Log the action
    await this.adminService.logAdminAction({
      adminId: admin.sub,
      action: 'FORCE_LOGOUT_USER',
      targetType: 'User',
      targetId: id,
      details: { username: result.username, revokedTokens: result.revokedTokens },
      ip,
      userAgent,
    });

    return result;
  }

  // =========================================================================
  // Admin Action Logs
  // =========================================================================

  @Get('action-logs')
  async listAdminActionLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listAdminActionLogs({
      page: page ? Number.parseInt(page, 10) : undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
    });
  }

  @Get('email-sends')
  async listEmailSendLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listEmailSendLogs({
      page: page ? Number.parseInt(page, 10) : undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
    });
  }

  @Get('auth-events')
  async listAuthEvents(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listAuditLogs({
      actions: [AuditAction.REGISTER, AuditAction.LOGIN, AuditAction.LOGOUT],
      page: page ? Number.parseInt(page, 10) : undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
    });
  }

  @Get('audit/logins')
  async listLoginAudits(
    @Query('startAt') startAt?: string,
    @Query('endAt') endAt?: string,
    @Query('result') result?: string,
    @Query('userId') userId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listLoginAudits({
      startAt,
      endAt,
      result: this.parseAuditResult(result),
      userId: userId ? Number.parseInt(userId, 10) : undefined,
      page: page ? Number.parseInt(page, 10) : undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
    });
  }

  @Get('audit/submissions')
  async listSubmissionAudits(
    @Query('startAt') startAt?: string,
    @Query('endAt') endAt?: string,
    @Query('courseId') courseId?: string,
    @Query('homeworkId') homeworkId?: string,
    @Query('problemId') problemId?: string,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listSubmissionAudits({
      startAt,
      endAt,
      courseId: courseId ? Number.parseInt(courseId, 10) : undefined,
      homeworkId,
      problemId,
      status,
      userId: userId ? Number.parseInt(userId, 10) : undefined,
      page: page ? Number.parseInt(page, 10) : undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
    });
  }

  @Get('audit/logins/export')
  async exportLoginAuditsCsv(
    @Query('startAt') startAt: string | undefined,
    @Query('endAt') endAt: string | undefined,
    @Query('result') result: string | undefined,
    @Query('userId') userId: string | undefined,
    @Query('limit') limit: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const csv = await this.adminService.exportLoginAuditsCsv({
      startAt,
      endAt,
      result: this.parseAuditResult(result),
      userId: userId ? Number.parseInt(userId, 10) : undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="login-audits.csv"',
    );
    return csv;
  }

  @Get('audit/submissions/export')
  async exportSubmissionAuditsCsv(
    @Query('startAt') startAt: string | undefined,
    @Query('endAt') endAt: string | undefined,
    @Query('courseId') courseId: string | undefined,
    @Query('homeworkId') homeworkId: string | undefined,
    @Query('problemId') problemId: string | undefined,
    @Query('status') status: string | undefined,
    @Query('userId') userId: string | undefined,
    @Query('limit') limit: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const csv = await this.adminService.exportSubmissionAuditsCsv({
      startAt,
      endAt,
      courseId: courseId ? Number.parseInt(courseId, 10) : undefined,
      homeworkId,
      problemId,
      status,
      userId: userId ? Number.parseInt(userId, 10) : undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="submission-audits.csv"',
    );
    return csv;
  }

  private parseAuditResult(result?: string): AuditResult | undefined {
    if (!result) return undefined;
    if (result === AuditResult.SUCCESS || result === AuditResult.FAILURE) {
      return result;
    }
    return undefined;
  }

  // =========================================================================
  // Email Domain Management
  // =========================================================================

  /** Get disposable blocklist file stats */
  @Get('email-domains/blocklist-stats')
  async getBlocklistStats() {
    return this.emailDomainService.getDisposableBlocklistStats();
  }

  /** Check if a domain is in the disposable blocklist file */
  @Get('email-domains/check-disposable')
  async checkDisposable(@Query('domain') domain: string) {
    return {
      domain: domain?.toLowerCase(),
      isDisposable: this.emailDomainService.isInDisposableBlocklist(
        domain || '',
      ),
    };
  }

  // --- Allowed Domains (Whitelist) ---

  @Get('email-domains/allowed')
  async listAllowedDomains(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.emailDomainService.listAllowedDomains({
      page: page ? Number.parseInt(page, 10) : undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
    });
  }

  @Post('email-domains/allowed')
  async createAllowedDomain(@Body() dto: CreateEmailDomainDto) {
    return this.emailDomainService.createAllowedDomain({
      domain: dto.domain,
      note: dto.note,
    });
  }

  @Put('email-domains/allowed/:id')
  async updateAllowedDomain(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmailDomainDto,
  ) {
    return this.emailDomainService.updateAllowedDomain(id, {
      domain: dto.domain,
      note: dto.note,
      enabled: dto.enabled,
    });
  }

  @Delete('email-domains/allowed/:id')
  async deleteAllowedDomain(@Param('id', ParseIntPipe) id: number) {
    await this.emailDomainService.deleteAllowedDomain(id);
    return { success: true };
  }

  // --- Blocked Domains (Custom Blacklist) ---

  @Get('email-domains/blocked')
  async listBlockedDomains(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.emailDomainService.listBlockedDomains({
      page: page ? Number.parseInt(page, 10) : undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
    });
  }

  @Post('email-domains/blocked')
  async createBlockedDomain(@Body() dto: CreateEmailDomainDto) {
    return this.emailDomainService.createBlockedDomain({
      domain: dto.domain,
      note: dto.note,
    });
  }

  @Put('email-domains/blocked/:id')
  async updateBlockedDomain(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmailDomainDto,
  ) {
    return this.emailDomainService.updateBlockedDomain(id, {
      domain: dto.domain,
      note: dto.note,
      enabled: dto.enabled,
    });
  }

  @Delete('email-domains/blocked/:id')
  async deleteBlockedDomain(@Param('id', ParseIntPipe) id: number) {
    await this.emailDomainService.deleteBlockedDomain(id);
    return { success: true };
  }

  // =========================================================================
  // Bulk Create Users
  // =========================================================================

  @Get('courses-for-selection')
  async listCoursesForSelection() {
    return this.adminService.listCoursesForSelection();
  }

  @Post('bulk-create-users')
  async bulkCreateUsers(
    @Body() dto: BulkCreateUsersDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'];
    const locale = req.headers['accept-language']?.includes('zh')
      ? ('zh-TW' as const)
      : ('en' as const);

    return this.adminService.bulkCreateUsers(dto, user.sub, {
      ip,
      userAgent,
      locale,
    });
  }

  // =========================================================================
  // Blocked Submissions (AI Safety Check)
  // =========================================================================

  @Get('blocked-submissions')
  async listBlockedSubmissions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('threatType') threatType?: string,
    @Query('userId') userId?: string,
  ) {
    return this.adminService.listBlockedSubmissions({
      page: page ? Number.parseInt(page, 10) : undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
      threatType,
      userId: userId ? Number.parseInt(userId, 10) : undefined,
    });
  }

  @Get('blocked-submissions/:id')
  async getBlockedSubmission(@Param('id') id: string) {
    return this.adminService.getBlockedSubmission(id);
  }

  // =========================================================================
  // Demo Data Generator
  // =========================================================================

  @Get('demo-data/status')
  async getDemoDataStatus() {
    return this.demoDataService.getDemoDataStatus();
  }

  @Post('demo-data/generate')
  async generateDemoData(@Req() req: Request) {
    const user = (req as any).user;
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'];

    return this.demoDataService.generateDemoData(user.sub, {
      ip,
      userAgent,
    });
  }

  @Delete('demo-data')
  async clearDemoData(@Req() req: Request) {
    const user = (req as any).user;
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'];

    return this.demoDataService.clearDemoData(user.sub, {
      ip,
      userAgent,
    });
  }
}

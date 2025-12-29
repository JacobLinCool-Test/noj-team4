import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { JwtOrApiTokenAuthGuard } from '../api-token/guards/jwt-or-api-token-auth.guard';
import { ScopesGuard } from '../api-token/guards/scopes.guard';
import { RequireScopes } from '../api-token/decorators/require-scopes.decorator';
import { TokenScope } from '@prisma/client';
import { getClientIp } from '../common/request-ip';
import { CourseInvitationService } from './course-invitation.service';
import { CreateInvitationsDto } from './dto/create-invitations.dto';

type RequestMeta = { ip?: string; userAgent?: string };

@Controller()
export class CourseInvitationController {
  constructor(
    private readonly courseInvitationService: CourseInvitationService,
  ) {}

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_COURSES)
  @Post('courses/:slug/invitations')
  async createInvitations(
    @Param('slug') slug: string,
    @Body() dto: CreateInvitationsDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.courseInvitationService.createInvitations(
      slug,
      dto,
      user,
      this.extractMeta(req),
    );
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.READ_COURSES)
  @Get('courses/:slug/invitations')
  async listCourseInvitations(
    @Param('slug') slug: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.courseInvitationService.listCourseInvitations(slug, user);
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_COURSES)
  @Delete('courses/:slug/invitations/:id')
  async cancelInvitation(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    await this.courseInvitationService.cancelInvitation(
      slug,
      id,
      user,
      this.extractMeta(req),
    );
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/invitations')
  async listMyInvitations(@CurrentUser() user: JwtPayload) {
    return this.courseInvitationService.listMyInvitations(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/invitations/:id/accept')
  async acceptInvitation(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.courseInvitationService.acceptInvitation(
      id,
      user,
      this.extractMeta(req),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/invitations/:id/reject')
  async rejectInvitation(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    await this.courseInvitationService.rejectInvitation(
      id,
      user,
      this.extractMeta(req),
    );
    return { success: true };
  }

  private extractMeta(req: Request): RequestMeta {
    return {
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'] || '',
    };
  }
}

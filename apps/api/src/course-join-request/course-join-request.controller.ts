import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CourseJoinRequestService } from './course-join-request.service';
import type { Request } from 'express';
import type { JwtPayload } from '../auth/types/jwt-payload';

@Controller()
@UseGuards(JwtAuthGuard)
export class CourseJoinRequestController {
  constructor(private readonly joinRequestService: CourseJoinRequestService) {}

  @Post('courses/:slug/join-requests')
  async createJoinRequest(
    @Param('slug') courseSlug: string,
    @Req() req: Request,
  ) {
    const viewer = req.user as JwtPayload;
    const meta = {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.joinRequestService.createJoinRequest(courseSlug, viewer, meta);
  }

  @Get('courses/:slug/join-requests')
  async listCourseJoinRequests(
    @Param('slug') courseSlug: string,
    @Req() req: Request,
  ) {
    const viewer = req.user as JwtPayload;
    return this.joinRequestService.listCourseJoinRequests(courseSlug, viewer);
  }

  @Post('courses/:slug/join-requests/:id/approve')
  async approveJoinRequest(
    @Param('slug') courseSlug: string,
    @Param('id') requestId: string,
    @Req() req: Request,
  ) {
    const viewer = req.user as JwtPayload;
    const meta = {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.joinRequestService.approveJoinRequest(
      courseSlug,
      requestId,
      viewer,
      meta,
    );
  }

  @Post('courses/:slug/join-requests/:id/reject')
  async rejectJoinRequest(
    @Param('slug') courseSlug: string,
    @Param('id') requestId: string,
    @Req() req: Request,
  ) {
    const viewer = req.user as JwtPayload;
    const meta = {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.joinRequestService.rejectJoinRequest(
      courseSlug,
      requestId,
      viewer,
      meta,
    );
  }

  @Get('me/join-requests')
  async listMyJoinRequests(@Req() req: Request) {
    const viewer = req.user as JwtPayload;
    return this.joinRequestService.listMyJoinRequests(viewer);
  }

  @Delete('me/join-requests/:id')
  async cancelMyJoinRequest(
    @Param('id') requestId: string,
    @Req() req: Request,
  ) {
    const viewer = req.user as JwtPayload;
    const meta = {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.joinRequestService.cancelMyJoinRequest(requestId, viewer, meta);
  }
}

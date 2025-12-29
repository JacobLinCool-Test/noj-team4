import { Module } from '@nestjs/common';
import { CourseInvitationService } from './course-invitation.service';
import { CourseInvitationController } from './course-invitation.controller';

@Module({
  providers: [CourseInvitationService],
  controllers: [CourseInvitationController],
  exports: [CourseInvitationService],
})
export class CourseInvitationModule {}

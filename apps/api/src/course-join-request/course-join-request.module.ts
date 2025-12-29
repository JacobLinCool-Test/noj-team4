import { Module } from '@nestjs/common';
import { CourseJoinRequestController } from './course-join-request.controller';
import { CourseJoinRequestService } from './course-join-request.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CourseJoinRequestController],
  providers: [CourseJoinRequestService],
  exports: [CourseJoinRequestService],
})
export class CourseJoinRequestModule {}

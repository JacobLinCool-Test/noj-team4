import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminOnlyGuard } from './admin-only.guard';
import { MailModule } from '../mail/mail.module';
import { CourseModule } from '../course/course.module';
import { DemoDataService } from './demo-data/demo-data.service';

@Module({
  imports: [MailModule, CourseModule],
  controllers: [AdminController],
  providers: [AdminService, AdminOnlyGuard, DemoDataService],
})
export class AdminModule {}

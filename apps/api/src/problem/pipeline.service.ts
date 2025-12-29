import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/types/jwt-payload';
import { UserRole, CourseRole } from '@prisma/client';

/**
 * Pipeline 服務
 * 負責 Pipeline 配置相關的權限檢查
 */
@Injectable()
export class PipelineService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 檢查使用者是否有權限修改題目的 Pipeline 配置
   * 允許：題目擁有者、Admin、包含此題目的課程的 TEACHER/TA
   *
   * @param displayId 題目顯示 ID
   * @param user JWT payload
   * @returns 題目 ID
   * @throws NotFoundException 題目不存在
   * @throws ForbiddenException 無權限
   */
  async ensureCanModifyPipeline(
    displayId: string,
    user: JwtPayload,
  ): Promise<string> {
    const problem = await this.prisma.problem.findUnique({
      where: { displayId },
      include: {
        courses: { select: { courseId: true } },
      },
    });

    if (!problem) {
      throw new NotFoundException('題目不存在');
    }

    // 題目擁有者
    if (problem.ownerId === user.sub) {
      return problem.id;
    }

    // Admin
    if (user.role === UserRole.ADMIN) {
      return problem.id;
    }

    // 課程 TEACHER/TA
    const courseIds = problem.courses.map((c) => c.courseId);
    if (courseIds.length > 0) {
      const staffMembership = await this.prisma.courseMember.findFirst({
        where: {
          userId: user.sub,
          courseId: { in: courseIds },
          leftAt: null,
          roleInCourse: { in: [CourseRole.TEACHER, CourseRole.TA] },
        },
      });

      if (staffMembership) {
        return problem.id;
      }
    }

    throw new ForbiddenException(
      '只有題目擁有者、課程教師/助教或管理員可以修改 Pipeline 配置',
    );
  }

  /**
   * 檢查使用者是否有權限查看題目的 Pipeline 配置
   * 允許：題目擁有者、Admin、包含此題目的課程成員
   *
   * @param displayId 題目顯示 ID
   * @param user JWT payload（可選，訪客只能查看公開題目）
   * @returns 題目資訊
   * @throws NotFoundException 題目不存在
   * @throws ForbiddenException 無權限
   */
  async ensureCanViewPipeline(
    displayId: string,
    user?: JwtPayload,
  ): Promise<any> {
    const problem = await this.prisma.problem.findUnique({
      where: { displayId },
      select: {
        id: true,
        ownerId: true,
        visibility: true,
        submissionType: true,
        pipelineConfig: true,
        checkerKey: true,
        checkerLanguage: true,
        templateKey: true,
        makefileKey: true,
        artifactPaths: true,
        networkConfig: true,
        courses: { select: { courseId: true } },
      },
    });

    if (!problem) {
      throw new NotFoundException('題目不存在');
    }

    // 公開題目
    if (problem.visibility === 'PUBLIC') {
      return problem;
    }

    // 未登入使用者無法查看非公開題目
    if (!user) {
      throw new ForbiddenException('請先登入');
    }

    // 題目擁有者
    if (problem.ownerId === user.sub) {
      return problem;
    }

    // Admin
    if (user.role === UserRole.ADMIN) {
      return problem;
    }

    // 課程成員（任何角色）
    const courseIds = problem.courses.map((c) => c.courseId);
    if (courseIds.length > 0) {
      const membership = await this.prisma.courseMember.findFirst({
        where: {
          userId: user.sub,
          courseId: { in: courseIds },
          leftAt: null,
        },
      });

      if (membership) {
        return problem;
      }
    }

    throw new ForbiddenException('無權限查看此題目的 Pipeline 配置');
  }
}

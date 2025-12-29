import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProblemService } from './problem.service';
import { CreateProblemDto } from './dto/create-problem.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { ProblemQueryDto } from './dto/problem-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { JwtOrApiTokenAuthGuard } from '../api-token/guards/jwt-or-api-token-auth.guard';
import { ScopesGuard } from '../api-token/guards/scopes.guard';
import { RequireScopes } from '../api-token/decorators/require-scopes.decorator';
import { TokenScope } from '@prisma/client';

@Controller('problems')
export class ProblemController {
  constructor(private readonly problemService: ProblemService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  async list(
    @Query() query: ProblemQueryDto,
    @CurrentUser() user?: JwtPayload,
  ) {
    const currentUserId = user?.sub ?? null;
    return this.problemService.listProblems(query, currentUserId);
  }

  @Get('tags')
  async listTags() {
    return this.problemService.getAllTags();
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  async getOne(
    @Param('id') id: string,
    @Query('homeworkId') homeworkId: string | undefined,
    @CurrentUser() user?: JwtPayload,
  ) {
    const currentUserId = user?.sub ?? null;
    return this.problemService.getProblemById(id, currentUserId, homeworkId);
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_PROBLEMS)
  @Post()
  async create(@Body() dto: CreateProblemDto, @CurrentUser() user: JwtPayload) {
    return this.problemService.createProblem(dto, user.sub);
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_PROBLEMS)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProblemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.problemService.updateProblem(id, dto, user.sub);
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.WRITE_PROBLEMS)
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.problemService.deleteProblem(id, user.sub);
    return { ok: true };
  }
}

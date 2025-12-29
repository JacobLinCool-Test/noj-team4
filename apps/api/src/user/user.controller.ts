import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePreferencesDto } from './dto/user-preferences.dto';
import { JwtOrApiTokenAuthGuard } from '../api-token/guards/jwt-or-api-token-auth.guard';
import { ScopesGuard } from '../api-token/guards/scopes.guard';
import { RequireScopes } from '../api-token/decorators/require-scopes.decorator';
import { TokenScope } from '@prisma/client';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.READ_USER)
  @Patch('me')
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(user.sub, dto);
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.READ_USER)
  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('AVATAR_FILE_REQUIRED');
    }
    return this.userService.uploadAvatar(user.sub, file);
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.READ_USER)
  @Delete('me/avatar')
  async removeAvatar(@CurrentUser() user: JwtPayload) {
    return this.userService.removeAvatar(user.sub);
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.READ_USER)
  @Get('me/preferences')
  async getPreferences(@CurrentUser() user: JwtPayload) {
    return this.userService.getPreferences(user.sub);
  }

  @UseGuards(JwtOrApiTokenAuthGuard, ScopesGuard)
  @RequireScopes(TokenScope.READ_USER)
  @Patch('me/preferences')
  async updatePreferences(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.userService.updatePreferences(user.sub, dto);
  }

  @Get(':username/avatar')
  async getAvatar(@Param('username') username: string, @Res() res: Response) {
    const { buffer, mimeType } = await this.userService.getAvatar(username);
    res.set({
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=86400',
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @Get(':username/stats')
  async getUserStats(@Param('username') username: string) {
    return this.userService.getUserStats(username);
  }

  @Get(':username/submissions')
  async getUserRecentSubmissions(
    @Param('username') username: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.userService.getUserRecentSubmissions(username, limitNum);
  }

  @Get(':username')
  async getUserProfile(@Param('username') username: string) {
    return this.userService.getUserProfile(username);
  }
}

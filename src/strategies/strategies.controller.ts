import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { StrategiesService, StrategyArticleDto } from './strategies.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';

@Controller(['api/strategies', 'strategies'])
export class StrategiesController {
  constructor(private readonly strategiesService: StrategiesService) {}

  @Get()
  findAll(@Query('category') category?: string) {
    return this.strategiesService.findAll(category);
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.strategiesService.findBySlug(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('strategy:manage')
  upsert(@Body() dto: StrategyArticleDto) {
    return this.strategiesService.upsert(dto);
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('strategy:sync')
  syncFromCreator(@Body('customPath') customPath?: string) {
    return this.strategiesService.syncFromCreator(customPath);
  }
}

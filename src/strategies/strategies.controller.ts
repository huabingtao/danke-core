import { Controller, Get, Param, Post, Query, Body } from '@nestjs/common';
import { StrategiesService, StrategyArticleDto } from './strategies.service';

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
  upsert(@Body() dto: StrategyArticleDto) {
    return this.strategiesService.upsert(dto);
  }

  @Post('sync')
  syncFromCreator(@Body('customPath') customPath?: string) {
    return this.strategiesService.syncFromCreator(customPath);
  }
}

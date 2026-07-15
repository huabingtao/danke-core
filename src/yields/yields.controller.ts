import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { YieldsService } from './yields.service';
import { CreateYieldDto } from './dto/create-yield.dto';
import { QueryYieldDto } from './dto/query-yield.dto';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@Controller('yields')
export class YieldsController {
  constructor(private readonly yieldsService: YieldsService) {}

  @Post()
  @UseGuards(ApiKeyGuard) // 鉴权保护
  createOrUpdate(@Body() createYieldDto: CreateYieldDto) {
    return this.yieldsService.createOrUpdate(createYieldDto);
  }

  @Get()
  findAll(@Query() query: QueryYieldDto) {
    return this.yieldsService.findAll(query);
  }

  @Get('monthly-report')
  getMonthlyReport(
    @Query('year') yearStr: string,
    @Query('month') monthStr: string,
  ) {
    if (!yearStr || !monthStr) {
      throw new BadRequestException('必须指定 year 和 month 查询参数');
    }

    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    if (isNaN(year) || isNaN(month)) {
      throw new BadRequestException('year 和 month 必须是有效的数字');
    }

    return this.yieldsService.getMonthlyReport(year, month);
  }
}

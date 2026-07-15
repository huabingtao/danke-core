import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { SourcesService } from './sources.service';
import { CreateSourceDto } from './dto/create-source.dto';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@Controller('sources')
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Post()
  @UseGuards(ApiKeyGuard) // 需要 API Key 鉴权
  create(@Body() createSourceDto: CreateSourceDto) {
    return this.sourcesService.create(createSourceDto);
  }

  @Get()
  findAll() {
    return this.sourcesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sourcesService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(ApiKeyGuard) // 需要 API Key 鉴权
  remove(@Param('id') id: string) {
    return this.sourcesService.remove(id);
  }
}

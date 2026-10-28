import { Controller, Get, Param, Query } from '@nestjs/common';
import { WikiService } from './wiki.service';

@Controller(['api/wiki', 'wiki'])
export class WikiController {
  constructor(private readonly wikiService: WikiService) {}

  @Get('entries')
  findEntries(
    @Query('category') category?: string,
    @Query('subcategory') subcategory?: string,
    @Query('edition') edition?: string,
    @Query('tag') tag?: string,
    @Query('q') q?: string,
  ) {
    return this.wikiService.findEntries({
      category,
      subcategory,
      edition,
      tag,
      q,
    });
  }

  @Get('entries/:slug')
  findEntryBySlug(@Param('slug') slug: string) {
    return this.wikiService.findEntryBySlug(slug);
  }

  @Get('matrices')
  findMatrices(@Query('category') category?: string) {
    return this.wikiService.findMatrices(category);
  }

  @Get('matrices/:code')
  findMatrixByCode(@Param('code') code: string) {
    return this.wikiService.findMatrixByCode(code);
  }
}

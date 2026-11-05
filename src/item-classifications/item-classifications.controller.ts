import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Request,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { ItemClassificationsService } from './item-classifications.service';
import {
  BulkClassificationDto,
  MatrixPreferenceDto,
} from './classifications.dto';
const validation = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

@Controller()
export class ItemClassificationsController {
  constructor(private readonly service: ItemClassificationsService) {}
  @Get('item-classifications')
  dictionaries() {
    return this.service.dictionaries();
  }

  @Post('item-classifications/bulk')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('item:create')
  bulk(@Body(validation) dto: BulkClassificationDto) {
    return this.service.bulk(dto);
  }

  @Get('me/preferences/yield-matrix')
  @UseGuards(JwtAuthGuard)
  preference(
    @Request() req: { user: { userId: string } },
    @Query('viewId') viewId?: string,
  ) {
    return this.service.preference(req.user.userId, viewId);
  }

  @Put('me/preferences/yield-matrix')
  @UseGuards(JwtAuthGuard)
  savePreference(
    @Request() req: { user: { userId: string } },
    @Body(validation) dto: MatrixPreferenceDto,
  ) {
    return this.service.savePreference(
      req.user.userId,
      dto.selectedItemIds,
      dto.viewId,
    );
  }
}

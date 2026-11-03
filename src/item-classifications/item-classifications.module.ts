import { Module } from '@nestjs/common';
import { ItemClassificationsController } from './item-classifications.controller';
import { ItemClassificationsService } from './item-classifications.service';
@Module({
  controllers: [ItemClassificationsController],
  providers: [ItemClassificationsService],
  exports: [ItemClassificationsService],
})
export class ItemClassificationsModule {}

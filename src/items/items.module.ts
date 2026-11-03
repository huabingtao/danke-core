import { ItemClassificationsModule } from '../item-classifications/item-classifications.module';
import { Module } from '@nestjs/common';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';

@Module({
  imports: [ItemClassificationsModule],
  controllers: [ItemsController],
  providers: [ItemsService],
})
export class ItemsModule {}

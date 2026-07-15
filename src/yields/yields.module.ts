import { Module } from '@nestjs/common';
import { YieldsController } from './yields.controller';
import { YieldsService } from './yields.service';

@Module({
  controllers: [YieldsController],
  providers: [YieldsService],
})
export class YieldsModule {}

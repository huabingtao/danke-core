import { Module } from '@nestjs/common';
import { WikiService } from './wiki.service';
import { WikiController } from './wiki.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WikiController],
  providers: [WikiService],
  exports: [WikiService],
})
export class WikiModule {}

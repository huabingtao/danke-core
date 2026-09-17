import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ItemsModule } from './items/items.module';
import { SourcesModule } from './sources/sources.module';
import { YieldsModule } from './yields/yields.module';
import { MenusModule } from './menus/menus.module';
import { AuthModule } from './auth/auth.module';
import { ReminderModule } from './modules/reminder/reminder.module';
import { AgentsModule } from './agents/agents.module';
import { StrategiesModule } from './strategies/strategies.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ItemsModule,
    SourcesModule,
    YieldsModule,
    MenusModule,
    AuthModule,
    ReminderModule,
    AgentsModule,
    StrategiesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

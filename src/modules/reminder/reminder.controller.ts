import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ReminderService,
  CreateReminderDto,
  UpdateReminderDto,
} from './reminder.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { RequirePermission } from '../../auth/require-permission.decorator';

@Controller('reminders')
export class ReminderController {
  constructor(private readonly reminderService: ReminderService) {}

  @Get()
  async findAll(
    @Query('category') category?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: 'asc' | 'desc',
  ) {
    return this.reminderService.findAll(category, sortBy, order);
  }

  @Get('daily-digest')
  async getDailyDigest(@Query('date') date?: string) {
    return this.reminderService.getDailyDigest(date);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.reminderService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('reminders:manage')
  async create(@Body() dto: CreateReminderDto) {
    return this.reminderService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('reminders:manage')
  async update(@Param('id') id: string, @Body() dto: UpdateReminderDto) {
    return this.reminderService.update(id, dto);
  }

  @Patch(':id/toggle')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('reminders:manage')
  async toggle(@Param('id') id: string) {
    return this.reminderService.toggleEnabled(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('reminders:manage')
  async remove(@Param('id') id: string) {
    return this.reminderService.remove(id);
  }
}

import { Controller, Get, Param, Post, Body, UseGuards } from '@nestjs/common';
import { AgentsService, AgentDto } from './agents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';

@Controller(['api/agents', 'agents'])
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  findAll() {
    return this.agentsService.findAll();
  }

  @Get(':code')
  findOne(@Param('code') code: string) {
    return this.agentsService.findByCode(code);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('agent:manage')
  upsert(@Body() dto: AgentDto) {
    return this.agentsService.upsert(dto);
  }
}

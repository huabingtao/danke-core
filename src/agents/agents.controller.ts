import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { AgentsService, AgentDto } from './agents.service';

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
  upsert(@Body() dto: AgentDto) {
    return this.agentsService.upsert(dto);
  }
}

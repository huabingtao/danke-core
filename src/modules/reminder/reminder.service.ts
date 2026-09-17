import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateReminderDto {
  name: string;
  category?: string;
  ruleType: 'ROUTINE' | 'CYCLE';
  routineType?: 'DAILY' | 'WEEKLY';
  weeklyDay?: number; // 0-6
  startDate?: Date | string; // "2026-08-23"
  durationDays?: number; // 7
  cycleDays?: number; // 7
  hasRedeemDay?: boolean;
  enabled?: boolean;
  digestTemplate?: string;
  redeemTemplate?: string;
  routineTemplate?: string;
  digestNote?: string;
}

export interface UpdateReminderDto {
  name?: string;
  category?: string;
  ruleType?: 'ROUTINE' | 'CYCLE';
  routineType?: 'DAILY' | 'WEEKLY';
  weeklyDay?: number;
  startDate?: Date | string;
  durationDays?: number;
  cycleDays?: number;
  hasRedeemDay?: boolean;
  enabled?: boolean;
  digestTemplate?: string;
  redeemTemplate?: string;
  routineTemplate?: string;
  digestNote?: string;
}

export interface DailyDigestItem {
  id: string;
  name: string;
  category: string;
  ruleType: string;
  routineType?: string;
  status: 'ACTIVE' | 'REDEEM' | 'ROUTINE_TRIGGER' | 'INACTIVE';
  daysRemaining?: number;
  isFirstDay?: boolean;
  isRedeemDay?: boolean;
  isTriggerDay?: boolean;
  statusText: string;
  digestNote?: string | null;
  fullText: string;
}

export interface DailyDigestResponse {
  date: string;
  weekday: string;
  totalActiveItems: number;
  summaryText: string;
  items: DailyDigestItem[];
}

const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(private readonly prisma: PrismaService) {}

  private formatComputedInfo(rule: any) {
    const now = new Date();
    const normalizedTarget = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    let daysRemaining = 0;
    let computedStatus = 'ACTIVE';

    if (rule.ruleType === 'CYCLE' && rule.startDate) {
      const startDate = new Date(rule.startDate);
      const normalizedStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0);
      const diffDays = Math.floor((normalizedTarget.getTime() - normalizedStart.getTime()) / (1000 * 60 * 60 * 24));

      const durationDays = rule.durationDays || 7;
      let cycleDays = rule.cycleDays || durationDays;
      if (rule.hasRedeemDay && cycleDays <= durationDays) {
        cycleDays = durationDays + 1;
      }

      if (diffDays < 0) {
        daysRemaining = Math.abs(diffDays);
        computedStatus = 'UPCOMING';
      } else {
        const dayInCycle = ((diffDays % cycleDays) + cycleDays) % cycleDays;
        if (dayInCycle < durationDays) {
          daysRemaining = durationDays - dayInCycle;
          computedStatus = 'ACTIVE';
        } else if (rule.hasRedeemDay && dayInCycle === durationDays) {
          daysRemaining = 0;
          computedStatus = 'REDEEM';
        } else {
          daysRemaining = cycleDays - dayInCycle;
          computedStatus = 'COOLDOWN';
        }
      }

      const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
      const redeemStr = rule.hasRedeemDay ? ' (+1天兑换)' : '';
      return {
        ...rule,
        daysRemaining,
        computedStatus,
        humanSchedule: `首期 ${startStr} | 持续 ${durationDays} 天${redeemStr} (每 ${cycleDays} 天循环)`,
      };
    } else if (rule.ruleType === 'ROUTINE') {
      let desc = '';
      if (rule.routineType === 'DAILY') {
        desc = '每日打卡提醒';
        daysRemaining = 0;
        computedStatus = 'ROUTINE_TRIGGER';
      } else if (rule.routineType === 'WEEKLY') {
        const dayName = WEEKDAY_NAMES[rule.weeklyDay ?? 0] || '周日';
        desc = `每周${dayName}打卡提醒`;
        const currentWeekday = normalizedTarget.getDay();
        if (currentWeekday === rule.weeklyDay) {
          daysRemaining = 0;
          computedStatus = 'ROUTINE_TRIGGER';
        } else {
          daysRemaining = ((rule.weeklyDay ?? 0) - currentWeekday + 7) % 7;
          computedStatus = 'ACTIVE';
        }
      }
      return {
        ...rule,
        daysRemaining,
        computedStatus,
        humanSchedule: desc || '常规定时',
      };
    }

    return {
      ...rule,
      daysRemaining,
      computedStatus,
      humanSchedule: '自定义规则',
    };
  }

  async findAll(category?: string, sortBy?: string, order?: 'asc' | 'desc') {
    const where = category && category !== 'ALL' ? { category } : {};
    const rules = await this.prisma.reminderRule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const formattedRules = rules.map((r) => this.formatComputedInfo(r));

    if (sortBy) {
      const isAsc = order !== 'desc';
      formattedRules.sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];

        if (sortBy === 'daysRemaining') {
          valA = a.daysRemaining ?? 999;
          valB = b.daysRemaining ?? 999;
          return isAsc ? valA - valB : valB - valA;
        }

        if (typeof valA === 'string' && typeof valB === 'string') {
          return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }

        if (valA < valB) return isAsc ? -1 : 1;
        if (valA > valB) return isAsc ? 1 : -1;
        return 0;
      });
    }

    return formattedRules;
  }

  async findOne(id: string) {
    const rule = await this.prisma.reminderRule.findUnique({
      where: { id },
    });
    if (!rule) {
      throw new NotFoundException(`Reminder rule with ID "${id}" not found`);
    }
    return this.formatComputedInfo(rule);
  }

  async create(dto: CreateReminderDto) {
    const rule = await this.prisma.reminderRule.create({
      data: {
        name: dto.name,
        category: dto.category || 'START_END',
        ruleType: dto.ruleType || 'CYCLE',
        routineType: dto.routineType || null,
        weeklyDay: dto.weeklyDay ?? null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        durationDays: dto.durationDays ?? null,
        cycleDays: dto.cycleDays ?? null,
        hasRedeemDay: dto.hasRedeemDay ?? false,
        digestTemplate: dto.digestTemplate || null,
        redeemTemplate: dto.redeemTemplate || null,
        routineTemplate: dto.routineTemplate || null,
        digestNote: dto.digestNote || null,
        enabled: dto.enabled ?? true,
      },
    });
    return this.formatComputedInfo(rule);
  }

  async update(id: string, dto: UpdateReminderDto) {
    await this.findOne(id);
    const rule = await this.prisma.reminderRule.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.category && { category: dto.category }),
        ...(dto.ruleType && { ruleType: dto.ruleType }),
        ...(dto.routineType !== undefined && { routineType: dto.routineType }),
        ...(dto.weeklyDay !== undefined && { weeklyDay: dto.weeklyDay }),
        ...(dto.startDate !== undefined && {
          startDate: dto.startDate ? new Date(dto.startDate) : null,
        }),
        ...(dto.durationDays !== undefined && { durationDays: dto.durationDays }),
        ...(dto.cycleDays !== undefined && { cycleDays: dto.cycleDays }),
        ...(dto.hasRedeemDay !== undefined && { hasRedeemDay: dto.hasRedeemDay }),
        ...(dto.digestTemplate !== undefined && { digestTemplate: dto.digestTemplate }),
        ...(dto.redeemTemplate !== undefined && { redeemTemplate: dto.redeemTemplate }),
        ...(dto.routineTemplate !== undefined && { routineTemplate: dto.routineTemplate }),
        ...(dto.digestNote !== undefined && { digestNote: dto.digestNote }),
        ...(dto.enabled !== undefined && { enabled: dto.enabled }),
      },
    });
    return this.formatComputedInfo(rule);
  }

  async toggleEnabled(id: string) {
    const existing = await this.findOne(id);
    const updated = await this.prisma.reminderRule.update({
      where: { id },
      data: {
        enabled: !existing.enabled,
      },
    });
    return this.formatComputedInfo(updated);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.reminderRule.delete({
      where: { id },
    });
  }

  /**
   * 每日提醒聚合计算服务 (Daily Digest API)
   * 支持 {name}, {days} 占位符自定义模板渲染
   */
  async getDailyDigest(targetDateStr?: string): Promise<DailyDigestResponse> {
    const targetDate = targetDateStr ? new Date(targetDateStr) : new Date();
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const day = targetDate.getDate();
    const normalizedTarget = new Date(year, month, day, 0, 0, 0, 0);

    const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const weekdayName = WEEKDAY_NAMES[normalizedTarget.getDay()] || '周日';

    // 仅筛选启用中的 CYCLE 或 ROUTINE 规则
    const rules = await this.prisma.reminderRule.findMany({
      where: {
        enabled: true,
        ruleType: {
          in: ['CYCLE', 'ROUTINE'],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const items: DailyDigestItem[] = [];

    for (const rule of rules) {
      if (rule.ruleType === 'CYCLE' && rule.startDate) {
        const start = new Date(rule.startDate);
        const normalizedStart = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);
        const diffDays = Math.floor((normalizedTarget.getTime() - normalizedStart.getTime()) / (1000 * 60 * 60 * 24));

        const durationDays = rule.durationDays || 7;
        let cycleDays = rule.cycleDays || durationDays;
        if (rule.hasRedeemDay && cycleDays <= durationDays) {
          cycleDays = durationDays + 1;
        }
        const dayInCycle = ((diffDays % cycleDays) + cycleDays) % cycleDays;

        if (dayInCycle < durationDays) {
          const daysLeft = durationDays - dayInCycle;
          const isFirstDay = dayInCycle === 0;

          // 使用自定义模板或默认模板
          const template = rule.digestTemplate?.trim() || '离本轮结束还剩 {days} 天';
          const statusText = template
            .replace(/\{name\}/g, rule.name)
            .replace(/\{days\}/g, String(daysLeft));

          const note = rule.digestNote?.trim() || null;
          const fullText = note ? `${statusText}（${note}）` : statusText;

          items.push({
            id: rule.id,
            name: rule.name,
            category: rule.category,
            ruleType: 'CYCLE',
            status: 'ACTIVE',
            daysRemaining: daysLeft,
            isFirstDay,
            isRedeemDay: false,
            statusText,
            digestNote: note,
            fullText,
          });
        } else if (rule.hasRedeemDay && dayInCycle === durationDays) {
          const template = rule.redeemTemplate?.trim() || '今天是专属兑换日，别忘了兑换奖励！';
          const statusText = template
            .replace(/\{name\}/g, rule.name)
            .replace(/\{days\}/g, '0');

          const note = rule.digestNote?.trim() || null;
          const fullText = note ? `${statusText}（${note}）` : statusText;

          items.push({
            id: rule.id,
            name: rule.name,
            category: rule.category,
            ruleType: 'CYCLE',
            status: 'REDEEM',
            daysRemaining: 0,
            isFirstDay: false,
            isRedeemDay: true,
            statusText,
            digestNote: note,
            fullText,
          });
        }
      } else if (rule.ruleType === 'ROUTINE') {
        const note = rule.digestNote?.trim() || null;
        if (rule.routineType === 'DAILY') {
          const template = rule.routineTemplate?.trim() || '今日记得打卡';
          const statusText = template.replace(/\{name\}/g, rule.name);
          const fullText = note ? `${statusText}（${note}）` : statusText;
          items.push({
            id: rule.id,
            name: rule.name,
            category: rule.category,
            ruleType: 'ROUTINE',
            routineType: 'DAILY',
            status: 'ROUTINE_TRIGGER',
            isTriggerDay: true,
            statusText,
            digestNote: note,
            fullText,
          });
        } else if (rule.routineType === 'WEEKLY' && rule.weeklyDay !== undefined && rule.weeklyDay !== null) {
          const currentWeekday = normalizedTarget.getDay();
          if (currentWeekday === rule.weeklyDay) {
            const template = rule.routineTemplate?.trim() || '今天是【{name}】打卡日';
            const statusText = template.replace(/\{name\}/g, rule.name).replace(/\{days\}/g, '0');
            const fullText = note ? `${statusText}（${note}）` : statusText;
            items.push({
              id: rule.id,
              name: rule.name,
              category: rule.category,
              ruleType: 'ROUTINE',
              routineType: 'WEEKLY',
              status: 'ROUTINE_TRIGGER',
              isTriggerDay: true,
              statusText,
              digestNote: note,
              fullText,
            });
          } else {
            const daysUntil = (rule.weeklyDay - currentWeekday + 7) % 7;
            const template = rule.digestTemplate?.trim() || '离本周【{name}】打卡还剩 {days} 天';
            const statusText = template.replace(/\{name\}/g, rule.name).replace(/\{days\}/g, String(daysUntil));
            const fullText = note ? `${statusText}（${note}）` : statusText;
            items.push({
              id: rule.id,
              name: rule.name,
              category: rule.category,
              ruleType: 'ROUTINE',
              routineType: 'WEEKLY',
              status: 'ACTIVE',
              daysRemaining: daysUntil,
              isTriggerDay: false,
              statusText,
              digestNote: note,
              fullText,
            });
          }
        }
      }
    }

    // 严格按照剩余天数升序排序 (越紧急/越快结束的排在越前面)
    items.sort((a, b) => (a.daysRemaining ?? 999) - (b.daysRemaining ?? 999));

    const summaryText = items.map((i) => i.fullText).join('\n');

    return {
      date: formattedDate,
      weekday: weekdayName,
      totalActiveItems: items.length,
      summaryText,
      items,
    };
  }
}

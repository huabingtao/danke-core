interface CycleRule {
  startDate: Date | string;
  durationDays?: number | null;
  cycleDays?: number | null;
  hasRedeemDay?: boolean | null;
}

// Stored durationDays excludes redemption; cycleDays is the recurrence interval.
// Public daysRemaining includes redemption but excludes any idle days afterward.
export function computeCycleState(rule: CycleRule, target: Date) {
  const calendarDay = (date: Date) =>
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
  const diffDays = calendarDay(target) - calendarDay(new Date(rule.startDate));
  const durationDays = rule.durationDays || 7;
  const eventDays = durationDays + (rule.hasRedeemDay ? 1 : 0);
  const cycleDays = Math.max(rule.cycleDays || eventDays, eventDays);
  const base = { durationDays, cycleDays };

  if (diffDays < 0) return {
    ...base, computedStatus: 'UPCOMING' as const, daysRemaining: -diffDays,
    playableDaysRemaining: 0, dayInCycle: -1, isFirstDay: false,
  };

  const dayInCycle = diffDays % cycleDays;
  if (dayInCycle < durationDays) return {
    ...base, computedStatus: 'ACTIVE' as const, daysRemaining: eventDays - dayInCycle,
    playableDaysRemaining: durationDays - dayInCycle, dayInCycle, isFirstDay: dayInCycle === 0,
  };
  if (rule.hasRedeemDay && dayInCycle === durationDays) return {
    ...base, computedStatus: 'REDEEM' as const, daysRemaining: 1,
    playableDaysRemaining: 0, dayInCycle, isFirstDay: false,
  };
  return {
    ...base, computedStatus: 'COOLDOWN' as const, daysRemaining: cycleDays - dayInCycle,
    playableDaysRemaining: 0, dayInCycle, isFirstDay: false,
  };
}

# Reminder cycle implementation plan

**Goal:** A 29-day escape cycle has 28 playable days and one redemption-only day. On 2026-09-30, anchored at 2026-08-12, report 9 total days remaining.

**Architecture:** Preserve database durationDays as playable days and cycleDays as recurrence length. Count redemption in daysRemaining; expose playableDaysRemaining separately. Use one backend cycle calculator for list/detail and daily digest. Admin accepts total cycle days and translates to existing API fields, and uses matching preview semantics.

**Tech Stack:** NestJS, Prisma, Next.js, React, Jest, Vitest.

## Constraints
- Preserve existing rules and custom templates; do not migrate every record by subtracting a day.
- No database or credentials in Git. Ignore SQLite runtime sidecars.
- No-play redemption status on day 29; next cycle starts on day 30.
- Existing non-redemption cycles keep their countdowns.
- Reuse creator/my-articles-md/提醒/日历系列封面/dist/cover_calendar_series.png unchanged.

## Steps
- [x] Add backend regression coverage for 2026-09-30=9/8 total/playable, 10-07=2/1, 10-08=1/0 REDEEM, 10-09=29/28; future starts, cooldown, and non-redemption rules.
- [x] Centralize backend cycle calculation and align list/detail/digest, including explicit redemption-only default copy.
- [x] Extract admin preview helpers into lib/reminder-status.ts; accept total days in form; edit legacy 28+1 as 29; save 28/29; reject fewer than 2 days for redemption rules.
- [x] Add frontend preview and form submission/reopen regression coverage; run relevant suites and both builds.
- [ ] Review diffs, commit and push both branches to origin, verify remote commit IDs.
- [x] Correct only the escape rule through the local API to durationDays=28, cycleDays=29, hasRedeemDay=true. Verify actual MCP output and boundary dates.
- [ ] Regenerate today's article from actual MCP result using the unchanged series cover; update existing WeChat draft and read it back.

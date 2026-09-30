# Reminder countdown contract

`durationDays` remains the number of playable days in storage and write requests. `cycleDays` remains the recurrence interval. An enabled `hasRedeemDay` adds one redemption-only day after play finishes. Existing records are not automatically shortened.

Admin users enter the complete period including redemption. A 29-day period with the final day reserved for redemption sends `durationDays: 28`, `cycleDays: 29`, `hasRedeemDay: true`.

List/detail responses and daily-digest items now count the redemption day in `daysRemaining`. The additive `playableDaysRemaining` field reports how many playable calendar days remain. Both counts include today. On redemption day, `daysRemaining` is 1, `playableDaysRemaining` is 0, and status is `REDEEM`. Templates using `{days}` receive this total; consumers needing the play countdown should read the separate field.

A rule anchored at 2026-08-12 with 28 playable days and a 29-day interval has these results:

| Date | Status | Total remaining | Playable remaining |
| --- | --- | ---: | ---: |
| 2026-09-30 | ACTIVE | 9 | 8 |
| 2026-10-07 | ACTIVE | 2 | 1 |
| 2026-10-08 | REDEEM | 1 | 0 |
| 2026-10-09 | ACTIVE | 29 | 28 |

Rules without redemption retain their countdowns. Idle days after an event are excluded from its remaining time. No daily-digest item is emitted before the first start date or during cooldown.

Validation: 28 reminder tests in danke-core and 15 reminder tests in danke-admin passed, along with both production builds. The local escape rule was explicitly corrected from 29/30 to 28/29; deployments elsewhere must correct any similarly misconfigured rule through the admin form, not by reinterpreting every stored duration.

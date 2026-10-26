# Credit score Alerts page — design

The `/base-pages/credit-score-alerts` page (draft, copied from the Score
page: nav, "Here's What Has Changed" + description, SavvyMoney section).
Built natively, as the owner chose.

## Alerts Feed component

One native component placed between "Header + Description" and the
SavvyMoney section, 95% wide. Variants, one per filter, each closed and
open:

| Variant | Shows |
|---|---|
| All / All Open | Mark all as read, 3 credit updates, 2 monitoring alerts |
| New / New Open | Mark all as read, 3 credit updates |
| Updates / Updates Open | Mark all as read, 3 credit updates |
| Monitoring / Monitoring Open | 2 monitoring alerts (no Mark all as read) |

- **Field:** white, 2px `#E3E3E3` border, radius 8, the filter name and
  a chevron (up when open). Tap → that filter's Open variant.
- **Open:** the option list (All Alerts / New Alerts / Credit Updates /
  Credit Monitoring Alerts, current one bold) floats over the cards;
  tapping an option → that filter's closed variant.
- Below the cards: the rocket (owner's vector) and "Welcome to your
  Credit Alerts Feed." + text, centred.

## Cards (made-up values)

Credit updates, each: "October 2026", orange NEW badge, title Bold,
body with a bold navy link (no target):

1. Payment History — "You have made regular payments on 3 of your
   accounts. Making on-time payments impacts about 40% of your credit
   score. **View payment history**"
2. Credit Score Update — "Your credit score increased by 4 points this
   month. **View credit score**" (716 → 720, as the score history)
3. Credit Usage Update — "Your Credit Card usage changed from 4% to 5%.
   Keep usage below 30% for a better credit score. **View credit
   usage**" (as the card usage history)

Monitoring alerts: "August 2026" / "March 2025", "Credit monitoring:
**New Account**", chevron, "A new account has been opened." What they
open to waits for the owner's screenshot.

## Mark all as read

`AlertsStore.tsx`: a session-only `read` flag (module-level, cleared on
refresh). `withMarkAllRead` on the "Mark all as read" row sets it;
`withAlertBadge` on each NEW badge hides it once read. Overrides don't
run on the canvas, so the badges stay visible there. The lists don't
change.

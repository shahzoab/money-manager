# Prisma Postgres operation budget

The production target is at most 80,000 operations in a rolling 30-day
projection, leaving 20,000 operations of headroom below the free plan's
100,000-operation limit.

## Expected ceilings

| Workload | Expected operations |
| --- | ---: |
| Empty hourly recurring run | 1 |
| Recurring checks in a 31-day month | 744 |
| Warm protected navigation | 1–2 |
| Cold protected page | at most 8 |
| Normal mutation before refreshed reads | at most 4 |

These are application-level ceilings. Prisma counts a Prisma ORM query as one
operation and counts independent queries submitted as an array transaction as
one operation. Next.js data-cache hits do not call Prisma and therefore avoid a
database operation.

## Production rollout

1. Run `npm run db:backfill-transactions` once against production.
2. Deploy the optimized application.
3. Change cron-job.org to run once per hour.
4. Check Prisma Query Insights after 24 hours and again after seven days.
5. If the 30-day projection exceeds 80,000, set
   `REGISTRATION_ENABLED=false`, redeploy, and inspect the highest-volume route.

Open registration remains vulnerable to distributed abuse. Better Auth limits
sign-in and sign-up to five attempts per IP per five minutes in each application
instance, but this cannot provide an absolute quota guarantee against many IPs.

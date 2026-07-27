export const DATABASE_OPERATION_BUDGET = {
  monthlyLimit: 100_000,
  investigationThreshold: 80_000,
  hourlyCronMaximumPer31DayMonth: 744,
  coldProtectedPageMaximum: 8,
  warmProtectedPageMaximum: 2,
  normalMutationMaximumBeforeRefresh: 4,
} as const;

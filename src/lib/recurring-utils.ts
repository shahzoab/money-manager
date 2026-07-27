export function filterUpcomingPayments<T extends { nextDueDate: Date }>(
  payments: T[],
  until: Date,
): T[] {
  return payments.filter((payment) => payment.nextDueDate <= until);
}

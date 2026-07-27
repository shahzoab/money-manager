export function filterUpcomingPayments<T extends { nextDueDate: Date | string }>(
  payments: T[],
  until: Date,
): T[] {
  return payments.filter(
    (payment) => new Date(payment.nextDueDate).getTime() <= until.getTime(),
  );
}

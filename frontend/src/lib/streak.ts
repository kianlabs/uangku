export function calculateStreak(transactionDates: string[]): number {
  const uniqueDates = new Set(transactionDates.map(toLocalDateKey));
  if (uniqueDates.size === 0) return 0;

  const today = new Date();
  let checkDate = localDateKey(today);
  if (!uniqueDates.has(checkDate)) {
    today.setDate(today.getDate() - 1);
    checkDate = localDateKey(today);
  }

  let streak = 0;
  while (uniqueDates.has(checkDate)) {
    streak++;
    const [year, month, day] = checkDate.split("-").map(Number);
    const previous = new Date(year, month - 1, day - 1);
    checkDate = localDateKey(previous);
  }

  return streak;
}

function toLocalDateKey(value: string): string {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (year && month && day) return localDateKey(new Date(year, month - 1, day));
  return localDateKey(new Date(value));
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

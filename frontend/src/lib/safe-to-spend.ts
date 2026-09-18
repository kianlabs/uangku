import { getPayday } from "./local-storage";

export function calculateSafeToSpend(
  income: string,
  expense: string,
  mandatoryExpense: string,
  currentDay: number,
  currentMonth: number,
  currentYear: number
): { amount: number; daysLeft: number } {
  const incomeNum = parseFloat(income);
  const expenseNum = parseFloat(expense);
  const mandatoryNum = parseFloat(mandatoryExpense);

  const payday = getPayday();
  
  // Calculate next payday
  let nextPayday = new Date(currentYear, currentMonth - 1, payday);
  if (currentDay >= payday) {
    nextPayday = new Date(currentYear, currentMonth, payday);
  }
  
  const today = new Date(currentYear, currentMonth - 1, currentDay);
  const daysLeft = Math.ceil((nextPayday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  // Safe to spend = (income - expense - mandatory) / days left
  const balance = incomeNum - expenseNum - mandatoryNum;
  const amount = daysLeft > 0 ? balance / daysLeft : 0;
  
  return { amount, daysLeft };
}

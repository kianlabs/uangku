export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface UserPreferences {
  payday?: number | null;
  onboarding_done?: boolean | null;
  tx_sources?: Record<string, string> | null;
  debt_tags?: Record<string, { tag: "utang" | "piutang"; settled: boolean }> | null;
  templates?: Array<{ id: string; name: string; amount: number; category: string }> | null;
}

export interface ApiError {
  code: string;
  message: string;
  fields?: Record<string, string>;
}

export type TransactionType = "income" | "expense";

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
}

export interface TransactionDetail {
  id: string;
  type: TransactionType;
  amount: string;
  description: string | null;
  transaction_date: string;
  category: Category;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: string;
  description: string | null;
  transaction_date: string;
  category: Category;
  created_at: string;
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface TransactionListResponse {
  items: Transaction[];
  pagination: PaginationMeta;
}

export interface ExpenseByCategoryItem {
  category_id: string;
  category_name: string;
  amount: string;
  percentage: number;
}

export interface RecentTransactionItem {
  id: string;
  type: TransactionType;
  amount: string;
  description: string | null;
  transaction_date: string;
  category_name: string;
}

export interface DashboardSummary {
  period: string;
  balance: string;
  monthly_income: string;
  monthly_expense: string;
  transaction_count: number;
  expense_by_category: ExpenseByCategoryItem[];
  recent_transactions: RecentTransactionItem[];
}

export interface DashboardMetrics {
  transaction_dates: string[];
  week_expense_total: string;
  week_top_category: string | null;
  safe_to_spend: string;
  days_left: number;
  remaining_balance: string;
  payday: number;
}

export interface Budget {
  category_id: string;
  category_name: string;
  type: TransactionType;
  amount: string;
  spent: string | null;
  percentage: number | null;
}

export interface BudgetListResponse {
  items: Budget[];
  month: string | null;
}

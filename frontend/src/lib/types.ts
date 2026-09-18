export interface User {
  id: string;
  email: string;
  created_at: string;
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

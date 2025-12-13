export type Transaction = {
  id: string;
  date: string; // ISO string
  title: string;
  account?: string;
  category?: string;
  type?: 'received' | 'paid' | 'transfer';
  amount: number; // positive = income, negative = expense
};

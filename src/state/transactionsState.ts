import AsyncStorage from '@react-native-async-storage/async-storage';
import { atom, selector } from 'recoil';

export type Transaction = {
  id: string;
  date: string; // ISO string
  title: string;
  account?: string;
  category?: string;
  type?: 'received' | 'paid' | 'transfer';
  amount: number; // positive = income, negative = expense
};

const STORAGE_KEY = 'transactions_v1';

export const transactionsState = atom<Transaction[]>({
  key: 'transactionsState',
  default: [],
  effects_UNSTABLE: [({ setSelf, onSet }) => {
    // Load persisted value on initialization
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved) {
        try {
          const parsed: Transaction[] = JSON.parse(saved);
          setSelf(parsed);
        } catch (e) {
          console.warn('Failed to parse persisted transactions', e);
        }
      }
    });

    // Persist on changes
    onSet((newValue, _, isReset) => {
      if (isReset) {
        AsyncStorage.removeItem(STORAGE_KEY).catch((e) => console.warn('Failed to clear persisted transactions', e));
      } else {
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newValue)).catch((e) =>
          console.warn('Failed to persist transactions', e)
        );
      }
    });
  }],
});

export const transactionsTotalsSelector = selector({
  key: 'transactionsTotalsSelector',
  get: ({ get }) => {
    const txs = get(transactionsState);
    const totals = txs.reduce(
      (acc, tx) => {
        if (tx.amount >= 0) acc.income += tx.amount;
        else acc.expenses += Math.abs(tx.amount);
        return acc;
      },
      { income: 0, expenses: 0 }
    );

    return {
      income: totals.income,
      expenses: totals.expenses,
      balance: totals.income - totals.expenses,
    };
  },
});

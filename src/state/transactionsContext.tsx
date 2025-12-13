import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Transaction } from './transactionsState';

const STORAGE_KEY = 'transactions_v1';

type TransactionsContextShape = {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
};

const TransactionsContext = createContext<TransactionsContextShape | undefined>(undefined);

export const TransactionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    let mounted = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (!mounted) return;
        if (saved) {
          try {
            const parsed: Transaction[] = JSON.parse(saved);
            setTransactions(parsed);
          } catch (e) {
            console.warn('Failed to parse persisted transactions', e);
          }
        }
      })
      .catch((err) => {
        if (mounted) console.warn('Failed to load persisted transactions', err);
      });

    return () => {
      mounted = false;
    };
  }, [])

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(transactions)).catch((e) => console.warn('Failed to persist transactions', e));
  }, [transactions]);

  return (
    <TransactionsContext.Provider value={{ transactions, setTransactions }}>
      {children}
    </TransactionsContext.Provider>
  );
};

export function useTransactionsContext() {
  const ctx = useContext(TransactionsContext);
  if (!ctx) throw new Error('useTransactionsContext must be used within a TransactionsProvider');
  return ctx;
}

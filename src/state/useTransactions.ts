import { useMemo } from 'react';
import type { Transaction } from './transactionsState';
import { transactionsTotalsSelector } from './transactionsState';

import { useTransactionsContext } from './transactionsContext';

let hasRecoil = true;
let Recoil: any = null;

try {
  /* eslint-disable global-require */
  Recoil = require('recoil');
  /* eslint-enable global-require */
} catch (e) {
  hasRecoil = false;
}

export function useTransactionsState(): [Transaction[], (update: React.SetStateAction<Transaction[]>) => void] {
  if (hasRecoil && Recoil) {
    try {
      // This will throw if Recoil import fails at runtime
      const hook = Recoil.useRecoilState(Recoil.transactionsState);
      return hook as unknown as [Transaction[], (update: React.SetStateAction<Transaction[]>) => void];
    } catch (e) {
      // fallback to context
      hasRecoil = false;
    }
  }

  const { transactions, setTransactions } = useTransactionsContext();
  return [transactions, setTransactions];
}

export function useTransactionsTotals() {
  if (hasRecoil && Recoil) {
    try {
      const totals = Recoil.useRecoilValue(transactionsTotalsSelector);
      return totals as { income: number; expenses: number; balance: number };
    } catch (e) {
      hasRecoil = false;
    }
  }

  // fallback compute totals
  const { transactions } = useTransactionsContext();
  return useMemo(() => {
    const totals = transactions.reduce((acc, tx) => {
      if (tx.amount >= 0) acc.income += tx.amount; else acc.expenses += Math.abs(tx.amount);
      return acc;
    }, { income: 0, expenses: 0 });
    return { income: totals.income, expenses: totals.expenses, balance: totals.income - totals.expenses };
  }, [transactions]);
}

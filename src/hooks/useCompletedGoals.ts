import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/authContext';
import { useTransactionRefresh } from '../contexts/transactionRefreshContext';
import * as goalService from '../services/goalService';
import { Goal } from '../types/firebase';

export function useCompletedGoals() {
  const { user } = useAuth();
  const { refreshKey } = useTransactionRefresh();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoals = async () => {
    if (!user) {
      setGoals([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const completedGoals = await goalService.getCompletedGoals(user.uid);
      setGoals(completedGoals);
    } catch (err: any) {
      console.error('Error fetching completed goals:', err);
      setError(err.message || 'Erro ao carregar metas concluídas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [user?.uid, refreshKey]);

  const refresh = () => {
    fetchGoals();
  };

  return {
    goals,
    loading,
    error,
    refresh,
    hasCompletedGoals: goals.length > 0,
  };
}

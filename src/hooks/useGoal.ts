import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/authContext';
import { useTransactionRefresh } from '../contexts/transactionRefreshContext';
import * as goalService from '../services/goalService';
import { Goal } from '../types/firebase';

export function useGoal() {
  const { user } = useAuth();
  const { refreshKey } = useTransactionRefresh();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoal = async () => {
    if (!user) {
      setGoal(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const activeGoal = await goalService.getActiveGoal(user.uid);
      setGoal(activeGoal);
    } catch (err: any) {
      console.error('Error fetching goal:', err);
      setError(err.message || 'Erro ao carregar meta');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoal();
  }, [user?.uid, refreshKey]);

  const refresh = () => {
    fetchGoal();
  };

  const progressPercentage = goal 
    ? goalService.calculateGoalProgress(goal.currentAmount, goal.targetAmount)
    : 0;

  return {
    goal,
    loading,
    error,
    refresh,
    progressPercentage,
    hasGoal: !!goal,
  };
}

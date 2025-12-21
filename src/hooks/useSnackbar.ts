import { useState, useCallback } from 'react';

interface SnackbarState {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
  duration: number;
}

export function useSnackbar() {
  const [snackbarState, setSnackbarState] = useState<SnackbarState>({
    visible: false,
    message: '',
    type: 'success',
    duration: 3000,
  });

  const showSnackbar = useCallback((
    message: string, 
    type: 'success' | 'error' | 'info' = 'success',
    duration: number = 3000
  ) => {
    setSnackbarState({
      visible: true,
      message,
      type,
      duration,
    });
  }, []);

  const hideSnackbar = useCallback(() => {
    setSnackbarState(prev => ({ ...prev, visible: false }));
  }, []);

  return {
    snackbarState,
    showSnackbar,
    hideSnackbar,
  };
}

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

/**
 * FabContext - Contexto para ação contextual do botão FAB
 * 
 * Permite que cada tela registre sua própria ação para o FAB.
 * Se nenhuma ação for registrada, o FAB usa a ação padrão (abrir modal de transação).
 * 
 * Uso:
 * 1. No componente da tela, use `useFab()` para registrar a ação:
 *    ```tsx
 *    const { setFabAction, clearFabAction } = useFab();
 *    
 *    useEffect(() => {
 *      setFabAction(() => {
 *        // Sua ação customizada aqui
 *        setShowModal(true);
 *      });
 *      return () => clearFabAction();
 *    }, []);
 *    ```
 * 
 * 2. O MainLayout automaticamente usa a ação registrada ou a padrão.
 */

type FabAction = () => void;

interface FabContextType {
  /** Ação atual do FAB (null = usar padrão) */
  fabAction: FabAction | null;
  /** Registra uma ação customizada para o FAB */
  setFabAction: (action: FabAction) => void;
  /** Remove a ação customizada (volta para padrão) */
  clearFabAction: () => void;
  /** Verifica se há uma ação customizada */
  hasCustomAction: boolean;
}

const FabContext = createContext<FabContextType | undefined>(undefined);

export function FabProvider({ children }: { children: ReactNode }) {
  const [fabAction, setFabActionState] = useState<FabAction | null>(null);

  const setFabAction = useCallback((action: FabAction) => {
    setFabActionState(() => action);
  }, []);

  const clearFabAction = useCallback(() => {
    setFabActionState(null);
  }, []);

  return (
    <FabContext.Provider
      value={{
        fabAction,
        setFabAction,
        clearFabAction,
        hasCustomAction: fabAction !== null,
      }}
    >
      {children}
    </FabContext.Provider>
  );
}

export function useFab() {
  const context = useContext(FabContext);
  if (context === undefined) {
    throw new Error('useFab must be used within a FabProvider');
  }
  return context;
}

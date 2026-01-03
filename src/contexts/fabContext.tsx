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
 *    const { setFabAction, clearFabAction, setFabData } = useFab();
 *    
 *    useFocusEffect(useCallback(() => {
 *      // Para ação customizada:
 *      setFabAction(() => setShowModal(true));
 *      
 *      // Ou para manter ação padrão mas com dados contextuais:
 *      setFabData({ initialAccountId: 'abc123' });
 *      
 *      return () => {
 *        clearFabAction();
 *        clearFabData();
 *      };
 *    }, []));
 *    ```
 * 
 * 2. O MainLayout automaticamente usa a ação registrada ou a padrão com os dados.
 */

type FabAction = () => void;

/** Dados contextuais para a ação padrão do FAB (modal de transação) */
export interface FabData {
  /** ID da conta pré-selecionada na modal de transação */
  initialAccountId?: string;
}

interface FabContextType {
  /** Ação atual do FAB (null = usar padrão) */
  fabAction: FabAction | null;
  /** Dados contextuais para a ação padrão */
  fabData: FabData;
  /** Registra uma ação customizada para o FAB */
  setFabAction: (action: FabAction) => void;
  /** Remove a ação customizada (volta para padrão) */
  clearFabAction: () => void;
  /** Define dados contextuais para a ação padrão */
  setFabData: (data: FabData) => void;
  /** Limpa dados contextuais */
  clearFabData: () => void;
  /** Verifica se há uma ação customizada */
  hasCustomAction: boolean;
}

const FabContext = createContext<FabContextType | undefined>(undefined);

export function FabProvider({ children }: { children: ReactNode }) {
  const [fabAction, setFabActionState] = useState<FabAction | null>(null);
  const [fabData, setFabDataState] = useState<FabData>({});

  const setFabAction = useCallback((action: FabAction) => {
    setFabActionState(() => action);
  }, []);

  const clearFabAction = useCallback(() => {
    setFabActionState(null);
  }, []);

  const setFabData = useCallback((data: FabData) => {
    setFabDataState(data);
  }, []);

  const clearFabData = useCallback(() => {
    setFabDataState({});
  }, []);

  return (
    <FabContext.Provider
      value={{
        fabAction,
        fabData,
        setFabAction,
        clearFabAction,
        setFabData,
        clearFabData,
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

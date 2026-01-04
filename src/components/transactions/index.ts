/**
 * Barrel export para o módulo de transactions
 */

// Tipos
export * from './types';

// Componentes de campos
export * from './fields';

// Componentes de pickers
export * from './pickers';

// Componentes de formulário
export { default as TransactionHeader } from './TransactionHeader';
export { default as TransactionForm } from './TransactionForm';
export { default as TransactionFormV2 } from './TransactionFormV2';

// Modal refatorado - versão nova (card centralizado)
export { default as AddTransactionModalV2 } from './AddTransactionModalV2';
export type { EditableTransaction as EditableTransactionV2 } from './AddTransactionModalV2';

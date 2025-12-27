import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Modal, Platform } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "../contexts/themeContext";
import { useAuth } from "../contexts/authContext";
import { spacing, borderRadius, getShadow } from "../theme";
import { useAccounts } from "../hooks/useAccounts";
import { useCustomAlert } from "../hooks/useCustomAlert";
import { useSnackbar } from "../hooks/useSnackbar";
import CustomAlert from "../components/CustomAlert";
import Snackbar from "../components/Snackbar";
import LoadingOverlay from "../components/LoadingOverlay";
import MainLayout from "../components/MainLayout";
import SimpleHeader from "../components/SimpleHeader";
import { AccountType, ACCOUNT_TYPE_LABELS, Account } from "../types/firebase";
import { formatCurrencyBRL } from "../utils/format";
import { deleteTransactionsByAccount, countTransactionsByAccount } from "../services/transactionService";
import * as transactionService from "../services/transactionService";
import { setAccountBalance } from "../services/accountService";
import { useTransactionRefresh } from "../contexts/transactionRefreshContext";

interface AccountTypeOption {
  id: AccountType;
  icon: string;
  label: string;
}

const ACCOUNT_TYPES: AccountTypeOption[] = [
  { id: 'checking', icon: 'bank', label: 'Corrente' },
  { id: 'wallet', icon: 'wallet', label: 'Carteira' },
  { id: 'investment', icon: 'chart-line', label: 'Investimento' },
  { id: 'other', icon: 'dots-horizontal', label: 'Outro' },
];

export default function ConfigureAccounts({ navigation }: any) {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const { alertState, showAlert, hideAlert } = useCustomAlert();
  const { snackbarState, showSnackbar, hideSnackbar } = useSnackbar();
  const { triggerRefresh } = useTransactionRefresh();
  const insets = useSafeAreaInsets();
  
  const [saving, setSaving] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showIncludeTooltip, setShowIncludeTooltip] = useState(false);
  const [adjustBalanceValue, setAdjustBalanceValue] = useState('');
  const [adjustBalanceModalVisible, setAdjustBalanceModalVisible] = useState(false);
  
  // Estado para loading overlay (operações longas)
  const [loadingOverlay, setLoadingOverlay] = useState({
    visible: false,
    message: '',
    progress: null as { current: number; total: number } | null,
  });

  // Modal unificado para criar/editar
  const [modalVisible, setModalVisible] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(true);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  
  // Estados unificados do formulário
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('checking');
  const [accountIcon, setAccountIcon] = useState('bank');
  const [accountInitialBalance, setAccountInitialBalance] = useState('');
  const [accountIncludeInTotal, setAccountIncludeInTotal] = useState(true);
  
  // Estado para controle de foco dos inputs
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Hook de contas do Firebase
  const { 
    activeAccounts,
    totalBalance,
    loading, 
    createAccount,
    updateAccount,
    archiveAccount,
    deleteAccount,
    recalculateBalance,
  } = useAccounts();

  // Converter string de valor para número
  function parseBalance(value: string): number {
    // Remove tudo exceto dígitos, vírgula e ponto
    let cleaned = value.replace(/[^\d,.]/g, '');
    // Remove pontos (separador de milhares) e substitui vírgula por ponto (separador decimal)
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }

  // Formatar valor monetário para exibição
  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';
    
    const numValue = parseInt(numbers, 10) / 100;
    return numValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  async function handleCreate() {
    if (!accountName.trim()) return;
    
    // Verificar se já existe uma conta com o mesmo nome
    const nameExists = activeAccounts.some(
      acc => acc.name.toLowerCase() === accountName.trim().toLowerCase()
    );
    if (nameExists) {
      showAlert('Nome duplicado', 'Já existe uma conta com esse nome.', [{ text: 'OK', style: 'default' }]);
      return;
    }
    
    setSaving(true);
    try {
      const balance = parseBalance(accountInitialBalance);
      
      const result = await createAccount({
        name: accountName.trim(),
        type: accountType,
        icon: accountIcon,
        initialBalance: balance,
        includeInTotal: accountIncludeInTotal,
        isArchived: false,
      });

      if (result) {
        resetModalState();
        setModalVisible(false);
        triggerRefresh();
        showSnackbar('Conta criada com sucesso!');
      } else {
        showAlert('Erro', 'Não foi possível criar a conta', [{ text: 'OK', style: 'default' }]);
      }
    } catch (error) {
      showAlert('Erro', 'Ocorreu um erro ao criar a conta', [{ text: 'OK', style: 'default' }]);
    } finally {
      setSaving(false);
    }
  }

  // Resetar estados do modal
  function resetModalState() {
    setAccountName('');
    setAccountType('checking');
    setAccountIcon('bank');
    setAccountInitialBalance('');
    setAccountIncludeInTotal(true);
    setEditingAccount(null);
    setShowTooltip(false);
    setShowIncludeTooltip(false);
    setFocusedField(null);
  }

  // Abrir modal para criar conta
  function openCreateModal() {
    resetModalState();
    setIsCreateMode(true);
    setModalVisible(true);
  }

  // Abrir modal para editar conta
  function openEditModal(account: Account) {
    setEditingAccount(account);
    setAccountName(account.name);
    setAccountType(account.type);
    setAccountIcon(account.icon || getAccountIcon(account.type));
    setAccountInitialBalance('');
    setAccountIncludeInTotal(account.includeInTotal !== false);
    setIsCreateMode(false);
    setModalVisible(true);
  }

  // Verificar se houve alterações nos dados da conta
  function hasChanges(): boolean {
    if (!editingAccount) return false;
    const originalIcon = editingAccount.icon || getAccountIcon(editingAccount.type);
    return (
      accountName.trim() !== editingAccount.name ||
      accountType !== editingAccount.type ||
      accountIcon !== originalIcon
    );
  }

  // Salvar edição
  async function handleSaveEdit() {
    if (!editingAccount || !accountName.trim()) return;
    
    // Verificar se já existe outra conta com o mesmo nome
    const nameExists = activeAccounts.some(
      acc => acc.id !== editingAccount.id && 
             acc.name.toLowerCase() === accountName.trim().toLowerCase()
    );
    if (nameExists) {
      showAlert('Nome duplicado', 'Já existe uma conta com esse nome.', [{ text: 'OK', style: 'default' }]);
      return;
    }

    setSaving(true);
    try {
      const result = await updateAccount(editingAccount.id, {
        name: accountName.trim(),
        type: accountType,
        icon: accountIcon,
        includeInTotal: accountIncludeInTotal,
      });

      if (result) {
        setModalVisible(false);
        resetModalState();
        triggerRefresh();
        showSnackbar('Conta atualizada!');
      } else {
        showAlert('Erro', 'Não foi possível atualizar a conta', [{ text: 'OK', style: 'default' }]);
      }
    } catch (error) {
      showAlert('Erro', 'Ocorreu um erro ao atualizar a conta', [{ text: 'OK', style: 'default' }]);
    } finally {
      setSaving(false);
    }
  }

  // Ajustar saldo da conta (cria transação de ajuste)
  async function handleAdjustBalance() {
    if (!editingAccount) return;
    setAdjustBalanceValue(editingAccount.balance.toFixed(2).replace('.', ','));
    setAdjustBalanceModalVisible(true);
  }

  // Recalcular saldo da conta com base nas transações reais
  async function handleRecalculateBalance() {
    if (!editingAccount || !user?.uid) return;
    
    const currentBalance = editingAccount.balance;
    
    showAlert(
      'Recalcular saldo?',
      `Esta ação irá recalcular o saldo da conta com base em todos os lançamentos marcados como "concluídos".\n\nSaldo atual: ${formatCurrencyBRL(currentBalance)}\n\nDeseja continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Recalcular', 
          style: 'default',
          onPress: performRecalculate 
        }
      ]
    );
  }

  async function performRecalculate() {
    if (!editingAccount || !user?.uid) return;
    
    setSaving(true);
    try {
      const oldBalance = editingAccount.balance;
      const newBalance = await recalculateBalance(editingAccount.id);
      
      if (newBalance === null) {
        showAlert('Erro', 'Não foi possível recalcular o saldo', [{ text: 'OK', style: 'default' }]);
        return;
      }
      
      const difference = newBalance - oldBalance;
      
      // Fechar modal e limpar estado
      setModalVisible(false);
      resetModalState();
      
      // Notificar refresh para atualizar toda a UI
      triggerRefresh();
      
      if (Math.abs(difference) < 0.01) {
        showAlert(
          'Saldo correto!',
          `O saldo estava correto:\n${formatCurrencyBRL(newBalance)}`,
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        const changeType = difference > 0 ? 'aumentou' : 'diminuiu';
        showAlert(
          'Saldo recalculado',
          `O saldo ${changeType} ${formatCurrencyBRL(Math.abs(difference))}.\n\nSaldo anterior: ${formatCurrencyBRL(oldBalance)}\nNovo saldo: ${formatCurrencyBRL(newBalance)}`,
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (err) {
      console.error('Erro ao recalcular saldo:', err);
      showAlert('Erro', 'Ocorreu um erro ao recalcular o saldo', [{ text: 'OK', style: 'default' }]);
    } finally {
      setSaving(false);
    }
  }

  async function performBalanceAdjustment() {
    if (!editingAccount || !user?.uid) return;
    
    const newBalance = parseBalance(adjustBalanceValue);
    const currentBalance = editingAccount.balance;
    const difference = newBalance - currentBalance;
    
    if (difference === 0) {
      showAlert('Aviso', 'O saldo informado é igual ao saldo atual.', [{ text: 'OK', style: 'default' }]);
      return;
    }
    
    setAdjustBalanceModalVisible(false);
    setSaving(true);
    try {
      // Criar transação de ajuste
      await transactionService.createBalanceAdjustment(
        user.uid,
        editingAccount.id,
        editingAccount.name,
        currentBalance,
        newBalance
      );
      
      // Atualizar o saldo da conta
      await setAccountBalance(editingAccount.id, newBalance);
      
      // Fechar modais e limpar estado
      setModalVisible(false);
      resetModalState();
      
      // Notificar refresh para atualizar toda a UI
      triggerRefresh();
      
      const adjustType = difference > 0 ? 'Crédito' : 'Débito';
      showAlert(
        'Saldo ajustado', 
        `${adjustType} de ${formatCurrencyBRL(Math.abs(difference))} aplicado.\n\nNovo saldo: ${formatCurrencyBRL(newBalance)}`,
        [{ text: 'OK', style: 'default' }]
      );
    } catch (err) {
      showAlert('Erro', 'Ocorreu um erro ao ajustar o saldo', [{ text: 'OK', style: 'default' }]);
    } finally {
      setSaving(false);
    }
  }

  // Resetar conta (deletar todas as transações)
  async function handleResetAccount() {
    if (!editingAccount || !user?.uid) return;
    
    // Primeiro, contar quantas transações existem
    const count = await countTransactionsByAccount(user.uid, editingAccount.id);
    const currentBalance = editingAccount.balance || 0;
    
    // Verificar se há algo para resetar
    if (count === 0 && currentBalance === 0) {
      showAlert('Aviso', 'Esta conta já está zerada (sem lançamentos e sem saldo).', [{ text: 'OK', style: 'default' }]);
      return;
    }
    
    // Mensagem de confirmação dinâmica
    let message = 'Esta ação irá ';
    if (count > 0) {
      message += `excluir ${count} lançamento${count > 1 ? 's' : ''} desta conta`;
    }
    if (currentBalance !== 0) {
      if (count > 0) message += ' e ';
      message += 'zerar o saldo';
    }
    message += '. Esta ação NÃO pode ser desfeita!';
    
    showAlert(
      'Resetar conta?',
      message,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Resetar', 
          style: 'destructive',
          onPress: async () => {
            // Fechar o modal de edição primeiro
            setModalVisible(false);
            
            // Mostrar loading overlay com progresso para operações longas
            setLoadingOverlay({
              visible: true,
              message: 'Excluindo lançamentos...',
              progress: count > 0 ? { current: 0, total: count } : null,
            });
            
            try {
              let deleted = 0;
              
              // Deletar todas as transações se houver
              if (count > 0) {
                const result = await deleteTransactionsByAccount(
                  user.uid, 
                  editingAccount.id,
                  // Callback de progresso para atualizar a UI
                  (current, total) => {
                    setLoadingOverlay(prev => ({
                      ...prev,
                      progress: { current, total },
                    }));
                  }
                );
                
                if (result.error) {
                  setLoadingOverlay({ visible: false, message: '', progress: null });
                  showAlert('Erro', result.error, [{ text: 'OK', style: 'default' }]);
                  return;
                }
                
                deleted = result.deleted;
              }
              
              // Atualizar mensagem para próxima etapa
              setLoadingOverlay(prev => ({
                ...prev,
                message: 'Zerando saldo...',
                progress: null,
              }));
              
              // Zerar o saldo da conta (sempre)
              await setAccountBalance(editingAccount.id, 0);
              
              // Atualizar a conta local para refletir o saldo zerado
              await updateAccount(editingAccount.id, { balance: 0 });

              // Notificar outras telas (Home/Lançamentos) para recarregar dados
              // Importante: Fazer refresh ANTES de esconder o loading
              setLoadingOverlay(prev => ({
                ...prev,
                message: 'Atualizando...',
              }));
              
              triggerRefresh();
              
              // Aguardar um pouco para garantir que o refresh foi processado
              await new Promise(resolve => setTimeout(resolve, 300));
              
              // Esconder loading overlay
              setLoadingOverlay({ visible: false, message: '', progress: null });
              
              // Limpar estado do modal
              setEditingAccount(null);
              
              // Mensagem de sucesso dinâmica
              let successMessage = '';
              if (deleted > 0) {
                successMessage = `${deleted} lançamento${deleted > 1 ? 's' : ''} excluído${deleted > 1 ? 's' : ''}. `;
              }
              successMessage += 'Saldo zerado.';
              
              showSnackbar(successMessage);
            } catch (err) {
              setLoadingOverlay({ visible: false, message: '', progress: null });
              showAlert('Erro', 'Ocorreu um erro ao resetar a conta', [{ text: 'OK', style: 'default' }]);
            }
          }
        },
      ]
    );
  }

  // Arquivar conta do modal
  async function handleArchiveFromModal() {
    if (!editingAccount) return;
    
    showAlert(
      'Arquivar conta?',
      `A conta "${editingAccount.name}" será arquivada e não aparecerá mais na lista.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Arquivar', 
          onPress: async () => {
            const result = await archiveAccount(editingAccount.id);
            if (result) {
              setModalVisible(false);
              resetModalState();
              triggerRefresh();
            } else {
              showAlert('Erro', 'Não foi possível arquivar a conta', [{ text: 'OK', style: 'default' }]);
            }
          }
        },
      ]
    );
  }

  // Excluir conta do modal
  async function handleDeleteFromModal() {
    if (!editingAccount) return;
    
    // Bloquear exclusão da conta padrão
    if (editingAccount.isDefault) {
      showAlert(
        'Ação não permitida',
        'A conta principal não pode ser excluída. Ela é essencial para o funcionamento do sistema.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }
    
    showAlert(
      'Excluir permanentemente?',
      `A conta "${editingAccount.name}" será excluída e não poderá ser recuperada. Os lançamentos associados a ela também serão excluídos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            const result = await deleteAccount(editingAccount.id);
            if (result) {
              setModalVisible(false);
              resetModalState();
              triggerRefresh();
              showSnackbar('Conta excluída!');
            } else {
              showAlert('Erro', 'Não foi possível excluir a conta', [{ text: 'OK', style: 'default' }]);
            }
          }
        },
      ]
    );
  }

  async function handleArchive(accountId: string, accountName: string) {
    showAlert(
      'O que deseja fazer?',
      `Conta: "${accountName}"`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Arquivar', 
          onPress: async () => {
            const result = await archiveAccount(accountId);
            if (!result) {
              showAlert('Erro', 'Não foi possível arquivar a conta', [{ text: 'OK', style: 'default' }]);
            } else {
              triggerRefresh();
            }
          }
        },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: () => confirmDelete(accountId, accountName),
        },
      ]
    );
  }

  async function confirmDelete(accountId: string, accountName: string) {
    showAlert(
      'Excluir permanentemente?',
      `A conta "${accountName}" será excluída e não poderá ser recuperada. Os lançamentos associados a ela também serão excluídos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            const result = await deleteAccount(accountId);
            if (result) {
              triggerRefresh();
              showSnackbar('Conta excluída!');
            } else {
              showAlert('Erro', 'Não foi possível excluir a conta', [{ text: 'OK', style: 'default' }]);
            }
          }
        },
      ]
    );
  }

  // Obter ícone do tipo de conta
  function getAccountIcon(type: AccountType, icon?: string): string {
    if (icon) return icon;
    const typeOption = ACCOUNT_TYPES.find(t => t.id === type);
    return typeOption?.icon || 'bank';
  }

  return (
    <MainLayout>
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header simples */}
      <SimpleHeader title="Contas" />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.centeredContainer}>
          <View style={styles.content}>


        {/* Contas existentes */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Carregando contas...</Text>
          </View>
        ) : activeAccounts.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Toque para editar
            </Text>
            <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
            </Text>
            <View style={[styles.card, { backgroundColor: colors.card }, getShadow(colors)]}>
              {activeAccounts.map((account, index) => (
                <Pressable
                  key={account.id}
                  onPress={() => openEditModal(account)}
                  onLongPress={() => handleArchive(account.id, account.name)}
                  delayLongPress={500}
                  style={({ pressed }) => [
                    styles.accountItem,
                    index < activeAccounts.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View style={[styles.iconCircle, { backgroundColor: colors.primaryBg }]}>
                    <MaterialCommunityIcons 
                      name={getAccountIcon(account.type, account.icon) as any} 
                      size={20} 
                      color={colors.primary} 
                    />
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={[styles.accountName, { color: colors.text }]}>{account.name}</Text>
                    <Text style={[styles.accountType, { color: colors.textMuted }]}>
                      {ACCOUNT_TYPE_LABELS[account.type]}
                    </Text>
                  </View>
                  <View style={styles.accountRight}>
                    <Text style={[
                      styles.accountBalance, 
                      { color: account.balance >= 0 ? colors.income : colors.expense }
                    ]}>
                      {formatCurrencyBRL(account.balance)}
                    </Text>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={[styles.emptyCard, { backgroundColor: colors.card }, getShadow(colors)]}>
              <MaterialCommunityIcons name="bank-off-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Nenhuma conta cadastrada
              </Text>
            </View>
          </View>
        )}

        {/* Botão para cadastrar nova conta */}
        <Pressable
          onPress={openCreateModal}
          style={({ pressed }) => [
            styles.addAccountButton,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.9 },
          ]}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          <Text style={styles.addAccountButtonText}>Cadastrar nova conta</Text>
        </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Modal Fullscreen de Criar/Editar */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
        statusBarTranslucent
      >
        <View style={[styles.fullscreenModal, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
          {/* Header moderno */}
          <View style={[styles.fullscreenHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {isCreateMode ? 'Nova Conta' : 'Editar Conta'}
            </Text>
            <Pressable
              onPress={() => setModalVisible(false)}
              style={({ pressed }) => [
                styles.closeButton,
                { backgroundColor: colors.bg === '#FFFFFF' ? '#f0f0f0' : 'rgba(255,255,255,0.1)' },
                pressed && { transform: [{ scale: 0.95 }] },
              ]}
            >
              <MaterialCommunityIcons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView 
            style={styles.modalBody} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: spacing.xl }}
          >
            {/* Nome */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Nome da conta</Text>
              <View style={[
                styles.inputContainer, 
                { 
                  borderColor: focusedField === 'name' ? colors.primary : colors.border,
                  borderWidth: focusedField === 'name' ? 2 : 1,
                }
              ]}>
                <TextInput
                  value={accountName}
                  onChangeText={setAccountName}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Ex: Nubank, Caixa, Carteira..."
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.input, 
                    { color: colors.text },
                    Platform.select({ web: { outlineStyle: 'none' } as any }),
                  ]}
                />
              </View>
            </View>

            {/* Saldo atual (somente para edição) */}
            {!isCreateMode && editingAccount && (
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Saldo atual</Text>
                <View style={[styles.balanceDisplay, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <MaterialCommunityIcons name="cash" size={20} color={colors.textMuted} />
                  <Text style={[styles.balanceText, { color: colors.text }]}>
                    {formatCurrencyBRL(editingAccount.balance || 0)}
                  </Text>
                </View>
                <Text style={[styles.helpText, { color: colors.textMuted }]}>
                  Para ajustar o saldo, use as opções abaixo
                </Text>
              </View>
            )}

            {/* Saldo inicial (somente para criação) */}
            {isCreateMode && (
              <View style={styles.formGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.label, { color: colors.text }]}>Saldo inicial</Text>
                  <Pressable 
                    onPress={() => setShowTooltip(!showTooltip)}
                    hitSlop={8}
                  >
                    <MaterialCommunityIcons 
                      name="information-outline" 
                      size={18} 
                      color={colors.primary} 
                    />
                  </Pressable>
                </View>
                {showTooltip && (
                  <View style={[styles.tooltip, { backgroundColor: colors.primaryBg, borderColor: colors.primary }]}>
                    <Text style={[styles.tooltipText, { color: colors.text }]}>
                      O saldo inicial representa quanto dinheiro você já tinha nessa conta ao começar a usar o app. Esse valor não é uma receita.
                    </Text>
                  </View>
                )}
                <View style={[
                  styles.inputContainer, 
                  { 
                    borderColor: focusedField === 'balance' ? colors.primary : colors.border,
                    borderWidth: focusedField === 'balance' ? 2 : 1,
                  }
                ]}>
                  <Text style={[styles.currency, { color: colors.textMuted }]}>R$</Text>
                  <TextInput
                    value={accountInitialBalance}
                    onChangeText={(v) => setAccountInitialBalance(formatCurrency(v))}
                    onFocus={() => setFocusedField('balance')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="0,00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    style={[
                      styles.input, 
                      { color: colors.text },
                      Platform.select({ web: { outlineStyle: 'none' } as any }),
                    ]}
                  />
                </View>
              </View>
            )}

            {/* Tipo da conta (ícone + label mesclados) */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Tipo da conta</Text>
              <View style={styles.typeGrid}>
                {ACCOUNT_TYPES.map((type) => {
                  const isSelected = accountType === type.id;
                  return (
                    <Pressable
                      key={type.id}
                      onPress={() => {
                        setAccountType(type.id);
                        setAccountIcon(type.icon);
                      }}
                      style={[
                        styles.typeOption,
                        { borderColor: isSelected ? colors.primary : colors.border },
                        isSelected && { backgroundColor: colors.primaryBg },
                      ]}
                    >
                      <MaterialCommunityIcons 
                        name={type.icon as any} 
                        size={22} 
                        color={isSelected ? colors.primary : colors.textMuted} 
                      />
                      <Text 
                        style={[
                          styles.typeLabel, 
                          { color: isSelected ? colors.primary : colors.textMuted },
                        ]}
                      >
                        {type.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Checkbox para ocultar conta do saldo principal - SOMENTE NO MODO EDIÇÃO */}
            {!isCreateMode && (
              <View style={styles.formGroup}>
                <View style={styles.checkboxWithTooltip}>
                  <Pressable
                    onPress={() => setAccountIncludeInTotal(!accountIncludeInTotal)}
                    style={styles.checkboxRow}
                  >
                    <View style={[
                      styles.checkbox,
                      { borderColor: colors.primary },
                      !accountIncludeInTotal && { backgroundColor: colors.primary },
                    ]}>
                      {!accountIncludeInTotal && (
                        <MaterialCommunityIcons name="check" size={14} color="#fff" />
                      )}
                    </View>
                    <Text style={[styles.checkboxLabel, { color: colors.text }]}>
                      Ocultar essa conta do saldo principal da home
                    </Text>
                  </Pressable>
                  <Pressable 
                    onPress={() => setShowIncludeTooltip(!showIncludeTooltip)}
                    hitSlop={8}
                    style={styles.checkboxInfoButton}
                  >
                    <MaterialCommunityIcons 
                      name="information-outline" 
                      size={18} 
                      color={colors.primary} 
                    />
                  </Pressable>
                </View>
                {showIncludeTooltip && (
                  <View style={[styles.tooltip, { backgroundColor: colors.primaryBg, borderColor: colors.primary }]}>
                    <Text style={[styles.tooltipText, { color: colors.text }]}>
                      Quando marcado, esta conta não aparecerá no card "Onde está meu dinheiro" da tela inicial por questões de privacidade. Útil para ocultar contas que você prefere manter privadas (ex: investimentos, reservas de emergência).
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Ações do modo edição */}
            {!isCreateMode && (
              <View style={styles.modalActionsColumn}>
                {/* Botões de ação em linha */}
                <View style={styles.actionButtonsRow}>
                  {/* Botão de Ajustar Saldo */}
                  <Pressable
                    onPress={handleAdjustBalance}
                    style={({ pressed }) => [
                      styles.actionCardButton,
                      { backgroundColor: colors.primary + '15', borderColor: colors.primary },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <MaterialCommunityIcons name="tune" size={24} color={colors.primary} />
                    <Text style={[styles.actionCardTitle, { color: colors.primary }]}>Ajustar saldo</Text>
                    <Text style={[styles.actionCardHint, { color: colors.textMuted }]}>
                      Corrige o saldo sem alterar o histórico
                    </Text>
                  </Pressable>

                  {/* Botão de Resetar */}
                  <Pressable
                    onPress={handleResetAccount}
                    style={({ pressed }) => [
                      styles.actionCardButton,
                      { backgroundColor: colors.warning + '15', borderColor: colors.warning },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <MaterialCommunityIcons name="refresh" size={24} color={colors.warning} />
                    <Text style={[styles.actionCardTitle, { color: colors.warning }]}>Zerar conta</Text>
                    <Text style={[styles.actionCardHint, { color: colors.textMuted }]}>
                      Exclui lançamentos e zera o saldo
                    </Text>
                  </Pressable>
                </View>

                {/* Botões de Confirmar e Excluir */}
                <View style={styles.modalActions}>
                  {/* Botão Excluir - oculto para conta padrão */}
                  {!editingAccount?.isDefault && (
                    <Pressable
                      onPress={handleDeleteFromModal}
                      style={({ pressed }) => [
                        styles.actionButton,
                        styles.deleteButton,
                        { borderColor: colors.expense },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <MaterialCommunityIcons name="delete-outline" size={20} color={colors.expense} />
                      <Text style={[styles.actionButtonText, { color: colors.expense }]}>Excluir</Text>
                    </Pressable>
                  )}

                  <Pressable
                    onPress={handleSaveEdit}
                    disabled={saving || !accountName.trim() || !hasChanges()}
                    style={({ pressed }) => [
                      styles.actionButton,
                      { backgroundColor: colors.primary, borderColor: colors.primary },
                      pressed && { opacity: 0.9 },
                      (saving || !accountName.trim() || !hasChanges()) && { opacity: 0.6 },
                    ]}
                  >
                    <MaterialCommunityIcons name="check" size={20} color="#fff" />
                    <Text style={[styles.actionButtonText, { color: '#fff' }]}>
                      {saving ? 'Salvando...' : 'Confirmar'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Botão de criar (modo criação) */}
            {isCreateMode && (
              <Pressable
                onPress={handleCreate}
                disabled={saving || !accountName.trim()}
                style={({ pressed }) => [
                  styles.createButton,
                  { backgroundColor: colors.primary },
                  pressed && { opacity: 0.9 },
                  (saving || !accountName.trim()) && { opacity: 0.6 },
                ]}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                <Text style={styles.createButtonText}>
                  {saving ? 'Criando...' : 'Criar conta'}
                </Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Modal de Ajuste de Saldo */}
      <Modal
        visible={adjustBalanceModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setAdjustBalanceModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setAdjustBalanceModalVisible(false)}
        >
          <Pressable 
            style={[styles.adjustBalanceModal, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.adjustBalanceTitle, { color: colors.text }]}>
              Ajustar saldo da conta
            </Text>
            <Text style={[styles.adjustBalanceSubtitle, { color: colors.textMuted }]}>
              {editingAccount?.name}
            </Text>
            <Text style={[styles.adjustBalanceInfo, { color: colors.textMuted }]}>
              Saldo atual: {formatCurrencyBRL(editingAccount?.balance || 0)}
            </Text>
            <Text style={[styles.adjustBalanceLabel, { color: colors.text }]}>
              Qual é o saldo real desta conta hoje?
            </Text>
            <View style={[styles.inputContainer, { borderColor: colors.border }]}>
              <Text style={[styles.currency, { color: colors.textMuted }]}>R$</Text>
              <TextInput
                value={adjustBalanceValue}
                onChangeText={(v) => setAdjustBalanceValue(formatCurrency(v))}
                placeholder="0,00"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={[styles.input, { color: colors.text }]}
                autoFocus
              />
            </View>
            <View style={styles.adjustBalanceActions}>
              <Pressable
                onPress={() => setAdjustBalanceModalVisible(false)}
                style={[styles.adjustBalanceButton, { borderColor: colors.border }]}
              >
                <Text style={[styles.adjustBalanceButtonText, { color: colors.text }]}>
                  Cancelar
                </Text>
              </Pressable>
              <Pressable
                onPress={performBalanceAdjustment}
                style={[styles.adjustBalanceButton, { backgroundColor: colors.primary, borderColor: colors.primary }]}
              >
                <Text style={[styles.adjustBalanceButtonText, { color: '#fff' }]}>
                  Confirmar
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
      <Snackbar
        visible={snackbarState.visible}
        message={snackbarState.message}
        type={snackbarState.type}
        duration={snackbarState.duration}
        onDismiss={hideSnackbar}
      />
      <LoadingOverlay
        visible={loadingOverlay.visible}
        message={loadingOverlay.message}
        progress={loadingOverlay.progress}
      />
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  centeredContainer: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  content: {
    padding: spacing.lg,
  },
  totalCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
  emptyCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  sectionHint: {
    fontSize: 11,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '500',
  },
  accountType: {
    fontSize: 12,
    marginTop: 2,
  },
  accountBalance: {
    fontSize: 14,
    fontWeight: '600',
  },
  accountRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  // Botão de adicionar conta
  addAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  addAccountButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal fullscreen
  fullscreenModal: {
    flex: 1,
    overflow: 'hidden',
  },
  fullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formGroup: {
    padding: spacing.md,
    paddingBottom: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  currency: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: spacing.xs,
  },
  typeOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  typeLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  typeOptionSmall: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  typeLabelSmall: {
    fontSize: 9,
    marginTop: 2,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  iconOption: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    width: 40,
    height: 40,
  },
  iconGridModal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  iconOptionSmall: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    width: 36,
    height: 36,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    flex: 1,
  },
  checkboxWithTooltip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingRight: spacing.sm,
  },
  checkboxInfoButton: {
    padding: spacing.xs,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    fontSize: 14,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  tooltip: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  tooltipText: {
    fontSize: 12,
    lineHeight: 18,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: spacing.md,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 11,
    marginTop: spacing.xs,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  modalActionsColumn: {
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionCardButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: 4,
  },
  actionCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  actionCardHint: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  resetButtonText: {
    flex: 1,
  },
  resetHint: {
    fontSize: 11,
    marginTop: 2,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  deleteButton: {
    backgroundColor: 'transparent',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  balanceDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  balanceText: {
    fontSize: 16,
    fontWeight: '600',
  },
  adjustBalanceModal: {
    backgroundColor: 'white',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    maxWidth: 400,
    width: '90%',
  },
  adjustBalanceTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  adjustBalanceSubtitle: {
    fontSize: 14,
    marginBottom: spacing.md,
    opacity: 0.7,
  },
  adjustBalanceInfo: {
    fontSize: 13,
    marginBottom: spacing.lg,
    opacity: 0.6,
    fontStyle: 'italic',
  },
  adjustBalanceLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  adjustBalanceActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  adjustBalanceButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  adjustBalanceButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

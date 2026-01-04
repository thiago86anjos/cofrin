import { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "../contexts/themeContext";
import { useFab } from "../contexts/fabContext";
import { useCustomAlert } from "../hooks/useCustomAlert";
import { useSnackbar } from "../hooks/useSnackbar";
import CustomAlert from "../components/CustomAlert";
import Snackbar from "../components/Snackbar";
import LoadingOverlay from "../components/LoadingOverlay";
import MainLayout from "../components/MainLayout";
import SimpleHeader from "../components/SimpleHeader";
import CreateCreditCardModal from "../components/CreateCreditCardModal";
import { useAuth } from "../contexts/authContext";
import { spacing, borderRadius, getShadow } from "../theme";
import { useCreditCards } from "../hooks/useCreditCards";
import { useAccounts } from "../hooks/useAccounts";
import { CreditCard } from "../types/firebase";
import { formatCurrencyBRL } from "../utils/format";
import { useTransactionRefresh } from "../contexts/transactionRefreshContext";

export default function CreditCards({ navigation }: any) {
  const route = useRoute<any>();
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const { setFabAction, clearFabAction } = useFab();
  const { alertState, showAlert, hideAlert } = useCustomAlert();
  const { snackbarState, showSnackbar, hideSnackbar } = useSnackbar();
  const { triggerRefresh } = useTransactionRefresh();

  
  // Estado para loading overlay (operações longas)
  const [loadingOverlay, setLoadingOverlay] = useState({
    visible: false,
    message: '',
    progress: null as { current: number; total: number } | null,
  });

  // Modal rápida de criar/editar cartão (padrão visual da modal de transação)
  const [quickCreateVisible, setQuickCreateVisible] = useState(false);
  const [quickEditCard, setQuickEditCard] = useState<CreditCard | null>(null);

  // Hooks do Firebase
  const { 
    activeCards, 
    loading, 
    deleteCreditCard,
  } = useCreditCards();
  
  const { activeAccounts } = useAccounts();

  // Registrar ação do FAB quando a tela estiver em foco
  useFocusEffect(
    useCallback(() => {
      setFabAction(() => {
        // Verificar se há contas antes de abrir
        if (activeAccounts.length === 0) {
          showAlert(
            'Conta necessária',
            'Para cadastrar um cartão de crédito, você precisa ter pelo menos uma conta cadastrada para pagamento da fatura.',
            [
              { text: 'Cancelar', style: 'cancel' },
              { 
                text: 'Criar conta', 
                onPress: () => navigation.navigate('ConfigureAccounts'),
              },
            ]
          );
          return;
        }
        setQuickCreateVisible(true);
      });
      return () => clearFabAction();
    }, [setFabAction, clearFabAction, activeAccounts.length, showAlert, navigation])
  );

  // Abrir modal de criação automaticamente se vier da Home com openCreate=true
  useEffect(() => {
    if (route.params?.openCreate && activeAccounts.length > 0 && !loading) {
      // Pequeno delay para garantir que os estados estejam prontos
      const timer = setTimeout(() => {
        openCreateModal();
        // Limpar o parâmetro para não reabrir ao voltar
        navigation.setParams({ openCreate: undefined });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [route.params?.openCreate, activeAccounts.length, loading]);

  // Abrir modal de edição automaticamente se vier com editCardId
  useEffect(() => {
    if (route.params?.editCardId && activeCards.length > 0 && !loading) {
      const cardToEdit = activeCards.find(c => c.id === route.params.editCardId);
      if (cardToEdit) {
        const timer = setTimeout(() => {
          openEditModal(cardToEdit);
          navigation.setParams({ editCardId: undefined });
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [route.params?.editCardId, activeCards.length, loading]);

  // Abrir modal compacta (90% da tela)
  function openCreateModal() {
    // Verificar se há contas cadastradas antes de abrir
    if (activeAccounts.length === 0) {
      showAlert(
        'Conta necessária',
        'Para cadastrar um cartão de crédito, você precisa ter pelo menos uma conta cadastrada para pagamento da fatura.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Criar conta', 
            onPress: () => navigation.navigate('ConfigureAccounts'),
          },
        ]
      );
      return;
    }
    setQuickEditCard(null);
    setQuickCreateVisible(true);
  }

  // Arquivar cartão foi removido do fluxo.

  // Abrir modal de edição (usa a nova modal compacta)
  function openEditModal(card: CreditCard) {
    setQuickEditCard(card);
    setQuickCreateVisible(true);
  }

  // Excluir cartão pela modal rápida (com confirmação)
  function handleQuickDelete(cardId: string) {
    const card = activeCards.find(c => c.id === cardId);
    const deleteCardName = card?.name || 'este cartão';
    
    // Limpar estado da modal antes de mostrar alerta
    setQuickCreateVisible(false);
    setQuickEditCard(null);
    
    showAlert(
      'Excluir cartão',
      `Deseja realmente excluir "${deleteCardName}"? Os lançamentos do cartão serão mantidos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const success = await deleteCreditCard(cardId);
              if (success) {
                showSnackbar('Cartão excluído com sucesso');
                triggerRefresh();
              } else {
                showSnackbar('Erro ao excluir cartão', 'error');
              }
            } catch (error) {
              showSnackbar('Erro ao excluir cartão', 'error');
            }
          }
        },
      ]
    );
  }

  // Resetar cartão (deletar todas as transações)
  async function handleResetCard() {
    if (!editingCard || !user?.uid) return;
    
    const count = await countTransactionsByCreditCard(user.uid, editingCard.id);
    
    if (count === 0) {
      showAlert('Aviso', 'Este cartão não possui lançamentos para excluir.', [{ text: 'OK', style: 'default' }]);
      return;
    }
    
    showAlert(
      'Resetar cartão?',
      `Esta ação irá excluir ${count} lançamento${count > 1 ? 's' : ''} deste cartão e zerar o valor usado. Esta ação NÃO pode ser desfeita!`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Resetar', 
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              // Deletar todas as transações
              const { deleted, error } = await deleteTransactionsByCreditCard(user.uid, editingCard.id);
              
              if (error) {
                showAlert('Erro', error, [{ text: 'OK', style: 'default' }]);
                return;
              }
              
              // Zerar o valor usado do cartão
              await updateCreditCardService(editingCard.id, { currentUsed: 0 });

              triggerRefresh();
              
              showAlert(
                'Cartão resetado', 
                `${deleted} lançamento${deleted > 1 ? 's' : ''} excluído${deleted > 1 ? 's' : ''}. Fatura zerada.`,
                [{ text: 'OK', style: 'default' }]
              );
              
              // Fechar modal e atualizar lista
              setModalVisible(false);
              resetModalState();
            } catch (err) {
              showAlert('Erro', 'Ocorreu um erro ao resetar o cartão', [{ text: 'OK', style: 'default' }]);
            } finally {
              setSaving(false);
            }
          }
        },
      ]
    );
  }

  // Arquivar cartão no modal foi removido.

  // Excluir cartão do modal
  async function handleDeleteFromModal() {
    if (!editingCard || !user?.uid) return;
    
    // Contar transações antes de confirmar
    const transactionCount = await countTransactionsByCreditCard(user.uid, editingCard.id);
    
    const message = transactionCount > 0
      ? `O cartão "${editingCard.name}" será excluído junto com ${transactionCount} lançamento${transactionCount > 1 ? 's' : ''}. Esta ação não pode ser desfeita.`
      : `O cartão "${editingCard.name}" será excluído e não poderá ser recuperado.`;
    
    showAlert(
      'Excluir permanentemente?',
      message,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            // Fechar modal primeiro
            setModalVisible(false);
            
            // Mostrar loading overlay se houver muitas transações
            if (transactionCount > 5) {
              setLoadingOverlay({
                visible: true,
                message: `Excluindo ${transactionCount} lançamentos...`,
                progress: null,
              });
            }
            
            try {
              const result = await deleteCreditCard(editingCard.id);
              
              // Esconder loading overlay
              setLoadingOverlay({ visible: false, message: '', progress: null });
              
              if (result) {
                setEditingCard(null);
                triggerRefresh();
                showSnackbar('Cartão excluído!');
              } else {
                showAlert('Erro', 'Não foi possível excluir o cartão', [{ text: 'OK', style: 'default' }]);
              }
            } catch (error) {
              setLoadingOverlay({ visible: false, message: '', progress: null });
              showAlert('Erro', 'Ocorreu um erro ao excluir o cartão', [{ text: 'OK', style: 'default' }]);
            }
          }
        },
      ]
    );
  }

  return (
    <MainLayout>
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header simples */}
      <SimpleHeader title="Cartões de Crédito" />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.centeredContainer}>
          <View style={styles.content}>
        {/* Cartões existentes */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Carregando cartões...</Text>
          </View>
        ) : activeCards.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Toque para editar
            </Text>
            <View style={[styles.card, { backgroundColor: colors.card }, getShadow(colors)]}>
              {activeCards.map((card, index) => {
                const cardColor = card.color || colors.primary;
                const available = card.limit - (card.currentUsed || 0);
                return (
                  <Pressable
                    key={card.id}
                    onPress={() => openEditModal(card)}
                    style={({ pressed }) => [
                      styles.cardItem,
                      index < activeCards.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: cardColor + '20' }]}>
                      <MaterialCommunityIcons 
                        name="credit-card"
                        size={20} 
                        color={cardColor} 
                      />
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={[styles.cardName, { color: colors.text }]}>{card.name}</Text>
                      <Text style={[styles.cardDetails, { color: colors.textSecondary }]}>
                        Limite: {formatCurrencyBRL(card.limit)}
                      </Text>
                      <Text style={[styles.cardDetails, { color: colors.textSecondary }]}>
                        Fecha dia {card.closingDay} • Vence dia {card.dueDay}
                      </Text>
                      <View style={styles.usageBar}>
                        <View 
                          style={[
                            styles.usageBarFill, 
                            { 
                              backgroundColor: cardColor,
                              width: `${Math.min(((card.currentUsed || 0) / card.limit) * 100, 100)}%` 
                            }
                          ]} 
                        />
                      </View>
                      <Text style={[styles.availableText, { color: colors.textMuted }]}>
                        Disponível: {formatCurrencyBRL(available)}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={[styles.emptyCard, { backgroundColor: colors.card }, getShadow(colors)]}>
              <MaterialCommunityIcons name="credit-card-off-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Nenhum cartão cadastrado
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                Toque no + para cadastrar
              </Text>
            </View>
          </View>
        )}
          </View>
        </View>
      </ScrollView>

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
      
      {/* Modal rápida de criação/edição */}
      <CreateCreditCardModal
        visible={quickCreateVisible}
        onClose={() => {
          setQuickCreateVisible(false);
          setQuickEditCard(null);
        }}
        onSave={triggerRefresh}
        onDelete={handleQuickDelete}
        editCard={quickEditCard}
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
    paddingBottom: 12,
  },
  centeredContainer: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  content: {
    padding: spacing.lg,
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
  emptySubtext: {
    fontSize: 12,
    marginTop: spacing.xs,
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
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '500',
  },
  cardDetails: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  usageBar: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  usageBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  availableText: {
    fontSize: 12,
    marginTop: 4,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    outlineStyle: 'none',
  } as any,
  currency: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 0,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  selectText: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  // Fullscreen modal styles
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
  fullscreenTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenContent: {
    flex: 1,
  },
  fullscreenContentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
    maxWidth: '100%',
  },
  // Days row
  daysRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  dayField: {
    flex: 1,
  },
  centeredInput: {
    textAlign: 'center',
  },
  // Label with help
  labelWithHelp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  helpLink: {
    fontSize: 13,
    fontWeight: '500',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  modalOptionText: {
    fontSize: 16,
    flex: 1,
  },
  helpText: {
    fontSize: 11,
    marginTop: spacing.xs,
  },
  modalActionsColumn: {
    paddingVertical: spacing.md,
    gap: spacing.sm,
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
  deleteButtonStyle: {
    backgroundColor: 'transparent',
  },
  cancelButton: {
    backgroundColor: 'transparent',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Ação estilo "Metas financeiras"
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  actionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

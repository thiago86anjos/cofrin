import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Platform, ScrollView, Modal, Alert } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "../contexts/themeContext";
import { spacing, borderRadius, getShadow } from "../theme";
import { useCreditCards } from "../hooks/useCreditCards";
import { useAccounts } from "../hooks/useAccounts";
import { CreditCard } from "../types/firebase";
import { formatCurrencyBRL } from "../utils/format";

interface CardBrandOption {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const CARD_BRANDS: CardBrandOption[] = [
  { id: 'nubank', name: 'Nubank', icon: 'credit-card', color: '#8B5CF6' },
  { id: 'itau', name: 'Itaú', icon: 'credit-card', color: '#F97316' },
  { id: 'bradesco', name: 'Bradesco', icon: 'credit-card', color: '#EF4444' },
  { id: 'bb', name: 'Banco do Brasil', icon: 'credit-card', color: '#FBBF24' },
  { id: 'caixa', name: 'Caixa', icon: 'credit-card', color: '#3B82F6' },
  { id: 'santander', name: 'Santander', icon: 'credit-card', color: '#EF4444' },
  { id: 'inter', name: 'Inter', icon: 'credit-card', color: '#F97316' },
  { id: 'c6', name: 'C6 Bank', icon: 'credit-card', color: '#1A1A1A' },
  { id: 'picpay', name: 'PicPay', icon: 'credit-card', color: '#21C25E' },
  { id: 'outro', name: 'Outro', icon: 'credit-card-outline', color: '#6B7280' },
];

export default function CreditCards({ navigation }: any) {
  const { colors } = useAppTheme();
  
  const [name, setName] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('nubank');
  const [limit, setLimit] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedAccountName, setSelectedAccountName] = useState('');
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estado para modal de edição
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [editName, setEditName] = useState('');
  const [editBrand, setEditBrand] = useState('nubank');
  const [editLimit, setEditLimit] = useState('');
  const [editCurrentUsed, setEditCurrentUsed] = useState('');
  const [editClosingDay, setEditClosingDay] = useState('');
  const [editDueDay, setEditDueDay] = useState('');
  const [editAccountId, setEditAccountId] = useState('');
  const [editAccountName, setEditAccountName] = useState('');
  const [showEditAccountPicker, setShowEditAccountPicker] = useState(false);

  // Hooks do Firebase
  const { 
    activeCards, 
    totalLimit,
    loading, 
    createCreditCard,
    updateCreditCard,
    archiveCreditCard,
    deleteCreditCard,
  } = useCreditCards();
  
  const { activeAccounts } = useAccounts();

  // Calcular total usado
  const totalUsed = activeCards.reduce((sum, card) => sum + (card.currentUsed || 0), 0);

  // Converter string de valor para número
  function parseValue(value: string): number {
    const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }

  async function handleCreate() {
    // Verificar se há contas cadastradas
    if (activeAccounts.length === 0) {
      Alert.alert(
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

    if (!name.trim()) return;
    
    const closingDayNum = parseInt(closingDay) || 1;
    const dueDayNum = parseInt(dueDay) || 10;
    
    if (closingDayNum < 1 || closingDayNum > 31 || dueDayNum < 1 || dueDayNum > 31) {
      Alert.alert('Erro', 'Os dias devem estar entre 1 e 31');
      return;
    }
    
    setSaving(true);
    try {
      const cardData: any = {
        name: name.trim(),
        brand: selectedBrand,
        color: CARD_BRANDS.find(b => b.id === selectedBrand)?.color || '#6B7280',
        limit: parseValue(limit),
        closingDay: closingDayNum,
        dueDay: dueDayNum,
        isArchived: false,
      };
      
      // Só adiciona paymentAccountId se tiver valor
      if (selectedAccountId) {
        cardData.paymentAccountId = selectedAccountId;
      }

      const result = await createCreditCard(cardData);

      if (result) {
        setName('');
        setLimit('');
        setClosingDay('');
        setDueDay('');
        setSelectedAccountId('');
        setSelectedAccountName('');
        setSelectedBrand('nubank');
        Alert.alert('Sucesso', 'Cartão cadastrado com sucesso!');
      } else {
        Alert.alert('Erro', 'Não foi possível cadastrar o cartão');
      }
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro ao cadastrar o cartão');
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(cardId: string, cardName: string) {
    Alert.alert(
      'Arquivar cartão',
      `Deseja arquivar o cartão "${cardName}"? Ele não aparecerá mais na lista, mas você pode restaurá-lo depois.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Arquivar', 
          style: 'destructive',
          onPress: async () => {
            const result = await archiveCreditCard(cardId);
            if (!result) {
              Alert.alert('Erro', 'Não foi possível arquivar o cartão');
            }
          }
        },
      ]
    );
  }

  // Abrir modal de edição
  function openEditModal(card: CreditCard) {
    const account = activeAccounts.find(a => a.id === card.paymentAccountId);
    setEditingCard(card);
    setEditName(card.name);
    setEditBrand(card.brand || 'outro');
    setEditLimit(card.limit.toString().replace('.', ','));
    setEditCurrentUsed((card.currentUsed || 0).toString().replace('.', ','));
    setEditClosingDay(card.closingDay.toString());
    setEditDueDay(card.dueDay.toString());
    setEditAccountId(card.paymentAccountId || '');
    setEditAccountName(account?.name || '');
    setEditModalVisible(true);
  }

  // Salvar edição
  async function handleSaveEdit() {
    if (!editingCard || !editName.trim()) return;

    const closingDayNum = parseInt(editClosingDay) || 1;
    const dueDayNum = parseInt(editDueDay) || 10;
    
    if (closingDayNum < 1 || closingDayNum > 31 || dueDayNum < 1 || dueDayNum > 31) {
      Alert.alert('Erro', 'Os dias devem estar entre 1 e 31');
      return;
    }

    setSaving(true);
    try {
      const updateData: any = {
        name: editName.trim(),
        brand: editBrand,
        color: CARD_BRANDS.find(b => b.id === editBrand)?.color || '#6B7280',
        limit: parseValue(editLimit),
        currentUsed: parseValue(editCurrentUsed),
        closingDay: closingDayNum,
        dueDay: dueDayNum,
      };
      
      // Só adiciona paymentAccountId se tiver valor, senão remove
      if (editAccountId) {
        updateData.paymentAccountId = editAccountId;
      } else {
        updateData.paymentAccountId = null; // Remove do documento
      }

      const result = await updateCreditCard(editingCard.id, updateData);

      if (result) {
        setEditModalVisible(false);
        setEditingCard(null);
        Alert.alert('Sucesso', 'Cartão atualizado com sucesso!');
      } else {
        Alert.alert('Erro', 'Não foi possível atualizar o cartão');
      }
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro ao atualizar o cartão');
    } finally {
      setSaving(false);
    }
  }

  // Arquivar cartão do modal
  async function handleArchiveFromModal() {
    if (!editingCard) return;
    
    Alert.alert(
      'Arquivar cartão?',
      `O cartão "${editingCard.name}" será arquivado e não aparecerá mais na lista.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Arquivar', 
          onPress: async () => {
            const result = await archiveCreditCard(editingCard.id);
            if (result) {
              setEditModalVisible(false);
              setEditingCard(null);
            } else {
              Alert.alert('Erro', 'Não foi possível arquivar o cartão');
            }
          }
        },
      ]
    );
  }

  // Excluir cartão do modal
  async function handleDeleteFromModal() {
    if (!editingCard) return;
    
    Alert.alert(
      'Excluir permanentemente?',
      `O cartão "${editingCard.name}" será excluído e não poderá ser recuperado. Lançamentos associados NÃO serão excluídos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            const result = await deleteCreditCard(editingCard.id);
            if (result) {
              setEditModalVisible(false);
              setEditingCard(null);
              Alert.alert('Sucesso', 'Cartão excluído com sucesso!');
            } else {
              Alert.alert('Erro', 'Não foi possível excluir o cartão');
            }
          }
        },
      ]
    );
  }

  const selectedBrandData = CARD_BRANDS.find(b => b.id === selectedBrand);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Pressable 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
          hitSlop={12}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Cartões de Crédito</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Resumo de limites */}
        {activeCards.length > 0 && (
          <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Limite total</Text>
                <Text style={styles.summaryValue}>{formatCurrencyBRL(totalLimit)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Usado</Text>
                <Text style={styles.summaryValue}>{formatCurrencyBRL(totalUsed)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Disponível</Text>
                <Text style={styles.summaryValue}>{formatCurrencyBRL(totalLimit - totalUsed)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Cartões existentes */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Carregando cartões...</Text>
          </View>
        ) : activeCards.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              SEUS CARTÕES
            </Text>
            <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
              Toque para editar
            </Text>
            <View style={[styles.card, { backgroundColor: colors.card }, getShadow(colors)]}>
              {activeCards.map((card, index) => {
                const brand = CARD_BRANDS.find(b => b.id === card.brand);
                const cardColor = card.color || brand?.color || colors.primary;
                const available = card.limit - (card.currentUsed || 0);
                return (
                  <Pressable
                    key={card.id}
                    onPress={() => openEditModal(card)}
                    onLongPress={() => handleArchive(card.id, card.name)}
                    delayLongPress={500}
                    style={({ pressed }) => [
                      styles.cardItem,
                      index < activeCards.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: cardColor + '20' }]}>
                      <MaterialCommunityIcons 
                        name={(brand?.icon || 'credit-card') as any}
                        size={20} 
                        color={cardColor} 
                      />
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={[styles.cardName, { color: colors.text }]}>{card.name}</Text>
                      <Text style={[styles.cardDetails, { color: colors.textSecondary }]}>
                        Limite: {formatCurrencyBRL(card.limit)} • Fecha dia {card.closingDay}
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
            </View>
          </View>
        )}

        {/* Novo cartão */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            CADASTRAR NOVO CARTÃO
          </Text>
          <View style={[styles.card, { backgroundColor: colors.card }, getShadow(colors)]}>
            {/* Nome */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Nome do cartão</Text>
              <View style={[styles.inputContainer, { borderColor: colors.border }]}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Ex: Nubank, Itaú Platinum..."
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { color: colors.text }]}
                />
              </View>
            </View>

            {/* Bandeira/Banco */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Banco/Bandeira</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.brandGrid}>
                  {CARD_BRANDS.map((brand) => (
                    <Pressable
                      key={brand.id}
                      onPress={() => setSelectedBrand(brand.id)}
                      style={[
                        styles.brandOption,
                        { borderColor: selectedBrand === brand.id ? brand.color : colors.border },
                        selectedBrand === brand.id && { backgroundColor: brand.color + '15' },
                      ]}
                    >
                      <MaterialCommunityIcons 
                        name={brand.icon as any} 
                        size={24} 
                        color={selectedBrand === brand.id ? brand.color : colors.textMuted} 
                      />
                      <Text 
                        style={[
                          styles.brandLabel, 
                          { color: selectedBrand === brand.id ? brand.color : colors.textMuted },
                        ]}
                        numberOfLines={1}
                      >
                        {brand.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Limite */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Limite</Text>
              <View style={[styles.inputContainer, { borderColor: colors.border }]}>
                <Text style={[styles.currency, { color: colors.textMuted }]}>R$</Text>
                <TextInput
                  value={limit}
                  onChangeText={setLimit}
                  placeholder="0,00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  style={[styles.input, { color: colors.text }]}
                />
              </View>
            </View>

            {/* Datas */}
            <View style={styles.rowFormGroup}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Dia fechamento</Text>
                <View style={[styles.inputContainer, { borderColor: colors.border }]}>
                  <TextInput
                    value={closingDay}
                    onChangeText={setClosingDay}
                    placeholder="10"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    maxLength={2}
                    style={[styles.input, { color: colors.text }]}
                  />
                </View>
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Dia vencimento</Text>
                <View style={[styles.inputContainer, { borderColor: colors.border }]}>
                  <TextInput
                    value={dueDay}
                    onChangeText={setDueDay}
                    placeholder="17"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    maxLength={2}
                    style={[styles.input, { color: colors.text }]}
                  />
                </View>
              </View>
            </View>

            {/* Conta de pagamento */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Conta de pagamento</Text>
              <Pressable 
                onPress={() => setShowAccountPicker(true)}
                style={[styles.selectButton, { borderColor: colors.border }]}
              >
                <Text style={[
                  styles.selectText, 
                  { color: selectedAccountName ? colors.text : colors.textMuted }
                ]}>
                  {selectedAccountName || 'Selecione a conta'}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Botão */}
            <Pressable
              onPress={handleCreate}
              disabled={saving || !name.trim()}
              style={({ pressed }) => [
                styles.createButton,
                { backgroundColor: selectedBrandData?.color || colors.primary },
                pressed && { opacity: 0.9 },
                (saving || !name.trim()) && { opacity: 0.6 },
              ]}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#fff" />
              <Text style={styles.createButtonText}>
                {saving ? 'Criando...' : 'Cadastrar cartão'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Modal de seleção de conta */}
      <Modal
        visible={showAccountPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAccountPicker(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowAccountPicker(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Selecionar conta</Text>
            {activeAccounts.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted, padding: spacing.md }]}>
                Nenhuma conta cadastrada
              </Text>
            ) : (
              activeAccounts.map((account) => (
                <Pressable
                  key={account.id}
                  onPress={() => {
                    setSelectedAccountId(account.id);
                    setSelectedAccountName(account.name);
                    setShowAccountPicker(false);
                  }}
                  style={[styles.modalOption, { borderBottomColor: colors.border }]}
                >
                  <MaterialCommunityIcons name="bank" size={20} color={colors.primary} />
                  <Text style={[styles.modalOptionText, { color: colors.text }]}>{account.name}</Text>
                  {selectedAccountId === account.id && (
                    <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                  )}
                </Pressable>
              ))
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Modal de Edição do Cartão */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.editModalContent, { backgroundColor: colors.card }]}>
            {/* Header do Modal */}
            <View style={[styles.editModalHeader, { borderBottomColor: colors.border }]}>
              <Pressable onPress={() => setEditModalVisible(false)} hitSlop={12}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </Pressable>
              <Text style={[styles.editModalTitle, { color: colors.text }]}>Editar Cartão</Text>
              <Pressable onPress={handleSaveEdit} disabled={saving} hitSlop={12}>
                <MaterialCommunityIcons 
                  name="check" 
                  size={24} 
                  color={saving ? colors.textMuted : colors.primary} 
                />
              </Pressable>
            </View>

            <ScrollView style={styles.editModalBody}>
              {/* Nome */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Nome do cartão</Text>
                <View style={[styles.inputContainer, { borderColor: colors.border }]}>
                  <TextInput
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Nome do cartão"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, { color: colors.text }]}
                  />
                </View>
              </View>

              {/* Banco/Bandeira */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Banco/Bandeira</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.brandGrid}>
                    {CARD_BRANDS.map((brand) => (
                      <Pressable
                        key={brand.id}
                        onPress={() => setEditBrand(brand.id)}
                        style={[
                          styles.brandOptionSmall,
                          { borderColor: editBrand === brand.id ? brand.color : colors.border },
                          editBrand === brand.id && { backgroundColor: brand.color + '15' },
                        ]}
                      >
                        <MaterialCommunityIcons 
                          name={brand.icon as any} 
                          size={18} 
                          color={editBrand === brand.id ? brand.color : colors.textMuted} 
                        />
                        <Text 
                          style={[
                            styles.brandLabelSmall, 
                            { color: editBrand === brand.id ? brand.color : colors.textMuted },
                          ]}
                          numberOfLines={1}
                        >
                          {brand.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Limite e Usado */}
              <View style={styles.rowFormGroup}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.text }]}>Limite</Text>
                  <View style={[styles.inputContainer, { borderColor: colors.border }]}>
                    <Text style={[styles.currency, { color: colors.textMuted }]}>R$</Text>
                    <TextInput
                      value={editLimit}
                      onChangeText={setEditLimit}
                      placeholder="0,00"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      style={[styles.input, { color: colors.text }]}
                    />
                  </View>
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.text }]}>Usado</Text>
                  <View style={[styles.inputContainer, { borderColor: colors.border }]}>
                    <Text style={[styles.currency, { color: colors.textMuted }]}>R$</Text>
                    <TextInput
                      value={editCurrentUsed}
                      onChangeText={setEditCurrentUsed}
                      placeholder="0,00"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      style={[styles.input, { color: colors.text }]}
                    />
                  </View>
                </View>
              </View>
              <Text style={[styles.helpText, { color: colors.textMuted, marginHorizontal: spacing.md }]}>
                Ajuste o valor usado se precisar corrigir
              </Text>

              {/* Datas */}
              <View style={styles.rowFormGroup}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.text }]}>Dia fechamento</Text>
                  <View style={[styles.inputContainer, { borderColor: colors.border }]}>
                    <TextInput
                      value={editClosingDay}
                      onChangeText={setEditClosingDay}
                      placeholder="10"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      maxLength={2}
                      style={[styles.input, { color: colors.text }]}
                    />
                  </View>
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.text }]}>Dia vencimento</Text>
                  <View style={[styles.inputContainer, { borderColor: colors.border }]}>
                    <TextInput
                      value={editDueDay}
                      onChangeText={setEditDueDay}
                      placeholder="17"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      maxLength={2}
                      style={[styles.input, { color: colors.text }]}
                    />
                  </View>
                </View>
              </View>

              {/* Conta de pagamento */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Conta de pagamento</Text>
                <Pressable 
                  onPress={() => setShowEditAccountPicker(true)}
                  style={[styles.selectButton, { borderColor: colors.border }]}
                >
                  <Text style={[
                    styles.selectText, 
                    { color: editAccountName ? colors.text : colors.textMuted }
                  ]}>
                    {editAccountName || 'Selecione a conta'}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textMuted} />
                </Pressable>
              </View>

              {/* Ações */}
              <View style={styles.modalActions}>
                <Pressable
                  onPress={handleArchiveFromModal}
                  style={({ pressed }) => [
                    styles.actionButton,
                    { backgroundColor: colors.bg, borderColor: colors.border },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <MaterialCommunityIcons name="archive-outline" size={20} color={colors.textMuted} />
                  <Text style={[styles.actionButtonText, { color: colors.text }]}>Arquivar</Text>
                </Pressable>

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
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de seleção de conta para edição */}
      <Modal
        visible={showEditAccountPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditAccountPicker(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowEditAccountPicker(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Selecionar conta</Text>
            <Pressable
              onPress={() => {
                setEditAccountId('');
                setEditAccountName('');
                setShowEditAccountPicker(false);
              }}
              style={[styles.modalOption, { borderBottomColor: colors.border }]}
            >
              <MaterialCommunityIcons name="close-circle-outline" size={20} color={colors.textMuted} />
              <Text style={[styles.modalOptionText, { color: colors.textMuted }]}>Nenhuma conta</Text>
              {editAccountId === '' && (
                <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
              )}
            </Pressable>
            {activeAccounts.map((account) => (
              <Pressable
                key={account.id}
                onPress={() => {
                  setEditAccountId(account.id);
                  setEditAccountName(account.name);
                  setShowEditAccountPicker(false);
                }}
                style={[styles.modalOption, { borderBottomColor: colors.border }]}
              >
                <MaterialCommunityIcons name="bank" size={20} color={colors.primary} />
                <Text style={[styles.modalOptionText, { color: colors.text }]}>{account.name}</Text>
                {editAccountId === account.id && (
                  <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: spacing.md,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  summaryCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
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
    padding: spacing.md,
    paddingBottom: 0,
  },
  rowFormGroup: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
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
  brandGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  brandOption: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    minWidth: 70,
    maxWidth: 80,
  },
  brandLabel: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  selectText: {
    fontSize: 16,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
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
  // Estilos do modal de edição
  editModalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  editModalBody: {
    padding: spacing.md,
    paddingTop: 0,
  },
  brandOptionSmall: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    paddingVertical: 6,
    paddingHorizontal: 8,
    minWidth: 60,
    maxWidth: 70,
  },
  brandLabelSmall: {
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
  },
  helpText: {
    fontSize: 11,
    marginTop: spacing.xs,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: spacing.xl,
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
});

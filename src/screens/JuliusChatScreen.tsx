import React, { useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/authContext';
import { askJulius, JuliusResponse } from '../services/julius';
import { palette, spacing, borderRadius, typography, shadows } from '../theme';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  intent?: string;
}

const JULIUS_GREETING = `E aí! Sou o Julius, seu assistente financeiro pessoal.

Posso te ajudar a entender seus gastos, encontrar onde você pode economizar e acompanhar sua evolução.

💬 *Dinheiro não cai do céu!*

Me pergunte algo como:
• "Quanto gastei esse mês?"
• "Qual categoria mais gasto?"
• "Comparar com mês anterior"`;

// Avatar do Julius (inspirado no Terry Crews)
const JULIUS_AVATAR = '📢';

export default function JuliusChatScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      text: JULIUS_GREETING,
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const handleSend = async () => {
    const trimmedText = inputText.trim();
    if (!trimmedText || isLoading || !user) return;

    Keyboard.dismiss();

    // Adicionar mensagem do usuário
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      text: trimmedText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    scrollToBottom();

    try {
      // Chamar Julius
      const response: JuliusResponse = await askJulius(user.uid, trimmedText);

      // Adicionar resposta do Julius
      const juliusMessage: ChatMessage = {
        id: `julius-${Date.now()}`,
        text: response.reply,
        isUser: false,
        timestamp: response.timestamp,
        intent: response.intent,
      };

      setMessages((prev) => [...prev, juliusMessage]);
    } catch (error) {
      console.error('Erro ao chamar Julius:', error);
      
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        text: 'Ops! Tive um problema ao processar sua pergunta. Tente novamente.',
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.isUser;

    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.juliusBubble,
        ]}
      >
        {!isUser && (
          <View style={styles.juliusAvatar}>
            <Text style={styles.juliusAvatarText}>{JULIUS_AVATAR}</Text>
          </View>
        )}
        <View
          style={[
            styles.messageContent,
            isUser ? styles.userContent : styles.juliusContent,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userText : styles.juliusText,
            ]}
          >
            {item.text}
          </Text>
          <Text
            style={[
              styles.timestamp,
              isUser ? styles.userTimestamp : styles.juliusTimestamp,
            ]}
          >
            {item.timestamp.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  const renderSuggestions = () => {
    const suggestions = [
      'Quanto gastei?',
      'Maior categoria',
      'Maiores gastos',
      'Ajuda',
    ];

    return (
      <View style={styles.suggestionsContainer}>
        {suggestions.map((suggestion, index) => (
          <TouchableOpacity
            key={index}
            style={styles.suggestionChip}
            onPress={() => {
              setInputText(suggestion);
            }}
          >
            <Text style={styles.suggestionText}>{suggestion}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarEmoji}>{JULIUS_AVATAR}</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Julius</Text>
            <Text style={styles.headerSubtitle}>Assistente Financeiro</Text>
          </View>
        </View>
        
        <View style={{ width: 40 }} />
      </View>

      {/* Chat Messages */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
        />

        {/* Sugestões */}
        {messages.length <= 1 && renderSuggestions()}

        {/* Loading indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingBubble}>
              <ActivityIndicator size="small" color={palette.primary} />
              <Text style={styles.loadingText}>Julius está pensando...</Text>
            </View>
          </View>
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Pergunte algo ao Julius..."
            placeholderTextColor={palette.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons
              name="send"
              size={20}
              color={
                inputText.trim() && !isLoading
                  ? palette.textInverse
                  : palette.textMuted
              }
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          Julius analisa apenas seus dados. Não recomenda investimentos.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: palette.card,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: palette.text,
  },
  headerSubtitle: {
    fontSize: typography.fontSizes.xs,
    color: palette.textSecondary,
  },
  
  // Chat
  chatContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  
  // Message Bubbles
  messageBubble: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'flex-end',
  },
  userBubble: {
    justifyContent: 'flex-end',
  },
  juliusBubble: {
    justifyContent: 'flex-start',
  },
  juliusAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  juliusAvatarText: {
    fontSize: 16,
  },
  messageContent: {
    maxWidth: '80%',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  userContent: {
    backgroundColor: palette.primary,
    borderBottomRightRadius: 4,
    marginLeft: 'auto',
  },
  juliusContent: {
    backgroundColor: palette.card,
    borderBottomLeftRadius: 4,
    ...shadows.sm,
  },
  messageText: {
    fontSize: typography.fontSizes.base,
    lineHeight: 22,
  },
  userText: {
    color: palette.textInverse,
  },
  juliusText: {
    color: palette.textDefault,
  },
  timestamp: {
    fontSize: typography.fontSizes.xs,
    marginTop: spacing.xs,
  },
  userTimestamp: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  juliusTimestamp: {
    color: palette.textMuted,
  },
  
  // Suggestions
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  suggestionChip: {
    backgroundColor: palette.primaryBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: palette.primary,
  },
  suggestionText: {
    color: palette.primary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  
  // Loading
  loadingContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    alignSelf: 'flex-start',
    gap: spacing.sm,
    ...shadows.sm,
  },
  loadingText: {
    color: palette.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  
  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: palette.card,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: palette.grayLight,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSizes.base,
    color: palette.text,
    maxHeight: 100,
    minHeight: 44,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: palette.buttonDisabledBg,
  },
  
  // Disclaimer
  disclaimer: {
    backgroundColor: palette.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  disclaimerText: {
    fontSize: typography.fontSizes.xs,
    color: palette.textMuted,
    textAlign: 'center',
  },
});

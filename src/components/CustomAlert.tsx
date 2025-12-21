import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../contexts/themeContext';
import { spacing, borderRadius, getShadow } from '../theme';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'cancel' | 'destructive' | 'default';
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
  onClose: () => void;
}

export default function CustomAlert({ visible, title, message, buttons, onClose }: CustomAlertProps) {
  const { colors } = useAppTheme();

  const handleButtonPress = (button: AlertButton) => {
    if (button.onPress) {
      button.onPress();
    }
    onClose();
  };

  const isDestructive = buttons?.some(b => b.style === 'destructive');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable 
        style={styles.overlay}
        onPress={onClose}
      >
        <Pressable 
          style={[styles.container, { backgroundColor: colors.card }, getShadow(colors, 'lg')]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header com ícone inline */}
          <View style={styles.header}>
            <View style={[
              styles.iconContainer, 
              { backgroundColor: isDestructive ? colors.dangerBg : colors.primaryBg }
            ]}>
              <MaterialCommunityIcons 
                name={isDestructive ? "alert-circle" : "information"}
                size={20} 
                color={isDestructive ? colors.danger : colors.primary}
              />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              {title}
            </Text>
          </View>

          {/* Mensagem */}
          {message && (
            <Text style={[styles.message, { color: colors.textMuted }]}>
              {message}
            </Text>
          )}

          {/* Botões - layout horizontal para 2 botões, vertical para mais */}
          <View style={[
            styles.buttonsContainer,
            buttons?.length === 2 && styles.buttonsRow
          ]}>
            {buttons?.map((button, index) => (
              <Pressable
                key={index}
                onPress={() => handleButtonPress(button)}
                style={({ pressed }) => [
                  styles.button,
                  buttons?.length === 2 && styles.buttonFlex,
                  button.style === 'cancel' && [styles.cancelButton, { borderColor: colors.border }],
                  button.style === 'destructive' && [styles.actionButton, { backgroundColor: colors.danger }],
                  button.style === 'default' && [styles.actionButton, { backgroundColor: colors.primary }],
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text
                  style={[
                    styles.buttonText,
                    button.style === 'cancel' && { color: colors.textMuted },
                    (button.style === 'destructive' || button.style === 'default') && { color: '#fff' },
                  ]}
                >
                  {button.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 320,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.md,
    paddingLeft: 40, // Alinha com o título (32 icon + 8 gap)
  },
  buttonsContainer: {
    gap: spacing.xs,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  buttonFlex: {
    flex: 1,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  actionButton: {
    // backgroundColor definido dinamicamente
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

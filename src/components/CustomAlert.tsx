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

  const getButtonColor = (style?: string) => {
    switch (style) {
      case 'destructive':
        return colors.danger;
      case 'cancel':
        return colors.textMuted;
      default:
        return colors.primary;
    }
  };

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
          {/* Ícone */}
          <View style={[styles.iconContainer, { backgroundColor: colors.primaryBg }]}>
            <MaterialCommunityIcons 
              name={buttons?.some(b => b.style === 'destructive') ? "alert-circle" : "information"}
              size={32} 
              color={buttons?.some(b => b.style === 'destructive') ? colors.danger : colors.primary}
            />
          </View>

          {/* Título */}
          <Text style={[styles.title, { color: colors.text }]}>
            {title}
          </Text>

          {/* Mensagem */}
          {message && (
            <Text style={[styles.message, { color: colors.textMuted }]}>
              {message}
            </Text>
          )}

          {/* Botões */}
          <View style={styles.buttonsContainer}>
            {buttons?.map((button, index) => (
              <Pressable
                key={index}
                onPress={() => handleButtonPress(button)}
                style={({ pressed }) => [
                  styles.button,
                  button.style === 'cancel' && styles.cancelButton,
                  button.style === 'destructive' && [styles.destructiveButton, { backgroundColor: colors.danger }],
                  button.style === 'default' && [styles.defaultButton, { backgroundColor: colors.primary }],
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonsContainer: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
  },
  destructiveButton: {
    // backgroundColor é definido dinamicamente
  },
  defaultButton: {
    // backgroundColor é definido dinamicamente
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

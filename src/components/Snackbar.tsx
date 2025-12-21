import { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../contexts/themeContext';
import { spacing, borderRadius, getShadow } from '../theme';

interface SnackbarProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onDismiss: () => void;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export default function Snackbar({ 
  visible, 
  message, 
  type = 'success', 
  duration = 3000, 
  onDismiss,
  action 
}: SnackbarProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 50,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'check-circle';
      case 'error':
        return 'alert-circle';
      case 'info':
      default:
        return 'information';
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return { bg: '#059669', icon: '#fff', text: '#fff' };
      case 'error':
        return { bg: colors.danger, icon: '#fff', text: '#fff' };
      case 'info':
      default:
        return { bg: colors.primary, icon: '#fff', text: '#fff' };
    }
  };

  const snackColors = getColors();

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          backgroundColor: snackColors.bg,
          bottom: insets.bottom + 140,
          opacity: fadeAnim,
          transform: [{ translateY }],
        },
        getShadow(colors, 'lg')
      ]}
    >
      <MaterialCommunityIcons 
        name={getIcon()} 
        size={20} 
        color={snackColors.icon} 
      />
      <Text style={[styles.message, { color: snackColors.text }]} numberOfLines={2}>
        {message}
      </Text>
      {action && (
        <Pressable onPress={action.onPress} hitSlop={8}>
          <Text style={[styles.actionText, { color: snackColors.text }]}>
            {action.label}
          </Text>
        </Pressable>
      )}
      <Pressable onPress={handleDismiss} hitSlop={8}>
        <MaterialCommunityIcons name="close" size={18} color={snackColors.icon} style={{ opacity: 0.7 }} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    zIndex: 9999,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});

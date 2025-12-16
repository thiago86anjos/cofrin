import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../contexts/themeContext';
import { spacing, getShadow } from '../theme';
import { logout } from '../services/auth';
import { useCustomAlert } from '../hooks';
import CustomAlert from './CustomAlert';

interface SettingsFooterProps {
  navigation: any;
}

export default function SettingsFooter({ navigation }: SettingsFooterProps) {
  const { colors } = useAppTheme();
  const { alertState, showAlert, hideAlert } = useCustomAlert();
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    showAlert(
      'Sair da conta',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sair', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              showAlert('Erro', 'Não foi possível sair da conta');
            }
          }
        },
      ]
    );
  };

  return (
    <>
      <View style={styles.safeArea}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 8),
            },
            getShadow(colors, 'lg'),
          ]}
        >
          <View style={styles.centeredContent}>
            <View style={styles.row}>
              <Pressable
                onPress={() => navigation.navigate('Bem-vindo')}
                style={({ pressed }) => [
                  styles.button,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <MaterialCommunityIcons name="home" size={24} color={colors.primary} />
                <Text style={[styles.buttonText, { color: colors.primary }]}>Home</Text>
              </Pressable>

              <Pressable
                onPress={handleLogout}
                style={({ pressed }) => [
                  styles.button,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <MaterialCommunityIcons name="logout" size={24} color={colors.expense} />
                <Text style={[styles.buttonText, { color: colors.expense }]}>Sair</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
      <CustomAlert {...alertState} onClose={hideAlert} />
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
  },
  centeredContent: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  row: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: spacing.sm,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

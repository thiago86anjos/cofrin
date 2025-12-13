import { View, Text, StyleSheet, Pressable, Platform, StatusBar, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import { palette } from '../theme';
import { useAuth } from '../contexts/authContext';

interface HeaderProps {
  // this component will be used as a header; it can receive the nav props via hooks
}

export default function AppHeader(props?: any) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const username = user?.email?.split('@')?.[0] || user?.displayName || 'Usuário';
  const initial = username?.charAt(0)?.toUpperCase() || 'U';

  const items = [
    { key: 'home', label: 'Visão geral', route: 'Bem-vindo' },
    { key: 'launches', label: 'Lançamentos', route: 'Lançamentos' },
    { key: 'reports', label: 'Relatórios', route: 'Relatórios' },
  ];

  // Determine active route - using navigation state would be better, but this is fine for top-level nav
  const state = (navigation as any).getState?.();
  const lastRoute = state?.routes?.[state?.routes?.length - 1];
  const currentRoute = lastRoute?.name || 'Bem-vindo';

  const isBack = !!props?.back;
  const { width } = useWindowDimensions();
  const showAvatarName = width >= 380;

  const topInset = Platform.OS === 'android' ? (StatusBar.currentHeight || insets.top || 8) : insets.top;

  return (
    <SafeAreaView style={{ backgroundColor: palette.blue }} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { paddingTop: topInset }] }>
    

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navContainer}>
        {items.map(item => (
          <Pressable
            key={item.key}
            onPress={() => navigation.navigate(item.route as any)}
            style={[
              styles.navItem,
              currentRoute === item.route ? styles.navItemActive : undefined,
            ]}
            hitSlop={{ top: 6, bottom: 6, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={`Navegar para ${item.label}`}
          >
            <Text style={[styles.navText, currentRoute === item.route ? styles.navTextActive : undefined]}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable onPress={() => navigation.navigate('Configurações')} style={styles.avatarArea} accessibilityRole="button" hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} accessibilityLabel="Configurações">
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitial}>{initial}</Text>
        </View>
        {showAvatarName && <Text style={styles.avatarName} numberOfLines={1}>{username}</Text>}
      </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    minHeight: 56,
    paddingHorizontal: 12,
    backgroundColor: palette.blue,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brandContainer: { paddingRight: 12 },
  brand: { color: palette.white, fontWeight: '700', fontSize: 16 },
  navContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 12, paddingVertical: 8 },
  navItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemActive: {
    backgroundColor: palette.white,
    borderColor: palette.border,
  },
  navText: { color: palette.white, fontWeight: '600', fontSize: 14 },
  navTextActive: { color: palette.blue },
  avatarArea: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: 'rgba(0,0,0,0.08)',
    borderWidth: 1,
  },
  avatarInitial: { color: palette.blue, fontWeight: '700' },
  avatarName: { color: palette.white, marginLeft: 8, maxWidth: 120 },
});

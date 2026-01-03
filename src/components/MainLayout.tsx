import React, { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppFooter, { FOOTER_HEIGHT } from './AppFooter';
import { AddTransactionModalV2 } from './transactions';
import { useTransactionRefresh } from '../contexts/transactionRefreshContext';
import { useFab } from '../contexts/fabContext';
import { useAppTheme } from '../contexts/themeContext';
import { spacing } from '../theme';

type Props = {
  children: React.ReactNode;
};

export default function MainLayout({ children }: Props) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();
  const { triggerRefresh } = useTransactionRefresh();
  const { fabAction, fabData } = useFab();
  const { colors } = useAppTheme();

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'despesa' | 'receita' | 'transfer'>('despesa');

  const bottomPad = useMemo(() => {
    const footerPaddingTop = spacing.sm;
    const footerPaddingBottom = Math.max(insets.bottom, spacing.sm);
    return FOOTER_HEIGHT + footerPaddingTop + footerPaddingBottom;
  }, [insets.bottom]);

  function openDefaultAdd() {
    setModalType('despesa');
    setModalVisible(true);
  }

  // Usa ação customizada do contexto se existir, senão usa a padrão (modal de transação)
  function handleFabPress() {
    if (fabAction) {
      fabAction();
    } else {
      openDefaultAdd();
    }
  }

  function handleSave() {
    // Trigger refresh for all screens listening to transaction changes
    triggerRefresh();
    setModalVisible(false);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.content, { paddingBottom: bottomPad, backgroundColor: colors.bg }]}>{children}</View>

      <AppFooter
        onHome={() => navigation.navigate('Bem-vindo' as any)}
        onAdd={handleFabPress}
        onLaunches={() => navigation.navigate('Metas do ano' as any)}
        onCategories={() => navigation.navigate('CategoryDetails' as any)}
        onSettings={() => navigation.navigate('Configurações' as any)}
      />

      <AddTransactionModalV2
        visible={modalVisible}
        initialType={modalType}
        initialAccountId={fabData.initialAccountId}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
});

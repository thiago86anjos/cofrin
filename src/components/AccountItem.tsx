import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import { List, Avatar, useTheme, Text as PaperText } from 'react-native-paper';
import { formatCurrencyBRL } from '../utils/format';

function AccountItemComponent({ name, type, balance }: any) {
  const theme = useTheme();

  return (
    <List.Item
      title={name}
      description={type}
      left={() => <Avatar.Text size={36} label={String(name)?.charAt(0)?.toUpperCase()} style={styles.avatar} />}
      right={() => (
        <PaperText style={[styles.balance, { color: theme.colors.text }]}>{typeof balance === 'number' ? formatCurrencyBRL(balance) : balance}</PaperText>
      )}
      style={styles.row}
    />
  );
}

export default memo(AccountItemComponent);

const styles = StyleSheet.create({
  row: { paddingVertical: 6 },
  avatar: { backgroundColor: '#f3f6ff' },
  balance: { fontWeight: '700', marginRight: 8, alignSelf: 'center' },
});

import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { isMobileWeb, isStandalone } from '../utils/platform';

/**
 * Componente para instalação do app como PWA
 * Renderiza apenas em web mobile, não instalado
 * - Android: Botão clicável para instalar
 * - iOS: Instruções para adicionar à tela inicial
 * - Desktop/Nativo: Não renderiza nada
 */
export function InstallAppButton(): React.ReactElement | null {
  const { canInstall, isAndroid, showIOSInstructions, install, wasInstallHandled } = usePWAInstall();

  // Não renderiza fora da web
  if (Platform.OS !== 'web') {
    return null;
  }

  // Não renderiza em desktop
  if (!isMobileWeb()) {
    return null;
  }

  // Não renderiza se já está instalado
  if (isStandalone()) {
    return null;
  }

  // Não renderiza se o usuário já lidou com a instalação (exceto iOS que sempre mostra)
  if (wasInstallHandled && !showIOSInstructions) {
    return null;
  }

  // iOS: Mostra instruções manuais
  if (showIOSInstructions) {
    return (
      <View style={styles.iosContainer}>
        <View style={styles.iosIconRow}>
          <MaterialCommunityIcons name="cellphone-arrow-down" size={20} color="#6B7280" />
          <Text style={styles.iosTitle}>Instalar este aplicativo</Text>
        </View>
        <Text style={styles.iosText}>
          Toque em{' '}
          <MaterialCommunityIcons name="export-variant" size={14} color="#5B3CC4" />
          {' '}Compartilhar e depois em{'\n'}"Adicionar à Tela de Início"
        </Text>
      </View>
    );
  }

  // Android: Mostra botão de instalação (sempre que for Android, mesmo sem prompt)
  if (isAndroid) {
    return (
      <Pressable
        onPress={install}
        style={({ pressed }) => [
          styles.androidButton,
          pressed && styles.androidButtonPressed,
        ]}
        accessibilityLabel="Instalar este aplicativo"
        accessibilityRole="button"
      >
        <MaterialCommunityIcons name="cellphone-arrow-down" size={20} color="#5B3CC4" />
        <Text style={styles.androidButtonText}>Instalar este aplicativo</Text>
      </Pressable>
    );
  }

  // Nada para mostrar
  return null;
}

const styles = StyleSheet.create({
  // Android - Botão de instalação
  androidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(91, 60, 196, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(91, 60, 196, 0.3)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 8,
  },
  androidButtonPressed: {
    backgroundColor: 'rgba(91, 60, 196, 0.2)',
  },
  androidButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5B3CC4',
  },

  // iOS - Instruções manuais
  iosContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  iosIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  iosTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  iosText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});

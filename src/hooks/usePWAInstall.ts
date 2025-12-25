import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { isMobileWeb, isStandalone, isIOS, isAndroidWeb } from '../utils/platform';
import { triggerInstallPrompt, hasInstallPrompt } from '../utils/pwaInit';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Declaração global para o prompt capturado
declare global {
  interface Window {
    deferredPWAPrompt: BeforeInstallPromptEvent | null;
  }
}

interface UsePWAInstallResult {
  /** Se o prompt de instalação está disponível (Android) */
  canInstall: boolean;
  /** Se é Android e pode mostrar botão (mesmo sem prompt ainda) */
  isAndroid: boolean;
  /** Se é iOS e pode mostrar instruções manuais */
  showIOSInstructions: boolean;
  /** Função para disparar o prompt de instalação (Android) */
  install: () => Promise<boolean>;
  /** Se o usuário já instalou ou dispensou o prompt */
  wasInstallHandled: boolean;
  /** Debug info */
  debugInfo: string;
}

/**
 * Hook para gerenciar instalação de PWA
 * Funciona apenas na web mobile, não faz nada em desktop ou apps nativos
 */
export function usePWAInstall(): UsePWAInstallResult {
  const [promptAvailable, setPromptAvailable] = useState(false);
  const [wasInstallHandled, setWasInstallHandled] = useState(false);
  const [debugInfo, setDebugInfo] = useState('Inicializando...');

  // Verifica condições básicas
  const isWebMobile = Platform.OS === 'web' && isMobileWeb();
  const isAlreadyInstalled = Platform.OS === 'web' && isStandalone();
  const isIOSDevice = Platform.OS === 'web' && isIOS();
  const isAndroidDevice = Platform.OS === 'web' && isAndroidWeb();

  useEffect(() => {
    if (Platform.OS !== 'web') {
      setDebugInfo('Não é web');
      return;
    }

    // Log de debug
    const info = `Mobile: ${isWebMobile}, Installed: ${isAlreadyInstalled}, iOS: ${isIOSDevice}, Android: ${isAndroidDevice}`;
    console.log('[usePWAInstall]', info);
    setDebugInfo(info);

    // Só roda na web mobile e se não estiver instalado
    if (!isWebMobile || isAlreadyInstalled || isIOSDevice) {
      return;
    }

    // Verifica se o prompt já está disponível
    if (hasInstallPrompt()) {
      console.log('[usePWAInstall] Prompt já disponível!');
      setPromptAvailable(true);
      setDebugInfo('Prompt disponível!');
    }

    // Escuta evento quando o prompt fica disponível
    const handlePromptReady = () => {
      console.log('[usePWAInstall] pwa-prompt-ready recebido!');
      setPromptAvailable(true);
      setDebugInfo('Prompt disponível!');
    };

    const handleAppInstalled = () => {
      console.log('[usePWAInstall] App instalado!');
      setPromptAvailable(false);
      setWasInstallHandled(true);
    };

    window.addEventListener('pwa-prompt-ready', handlePromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('pwa-prompt-ready', handlePromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isWebMobile, isAlreadyInstalled, isIOSDevice, isAndroidDevice]);

  const install = useCallback(async (): Promise<boolean> => {
    // Usa a função centralizada do pwaInit
    if (hasInstallPrompt()) {
      console.log('[usePWAInstall] Usando triggerInstallPrompt...');
      const result = await triggerInstallPrompt();
      if (result) {
        setWasInstallHandled(true);
      }
      return result;
    }

    // Fallback: instruções manuais
    console.log('[usePWAInstall] Sem prompt, mostrando instrução manual');
    alert('Para instalar o Cofrin:\n\n1. Toque no menu (⋮) do Chrome\n2. Selecione "Adicionar à tela inicial"\n3. Confirme a instalação');
    return false;
  }, []);

  // Não mostra nada se não for web mobile ou já estiver instalado
  if (!isWebMobile || isAlreadyInstalled) {
    return {
      canInstall: false,
      isAndroid: false,
      showIOSInstructions: false,
      install: async () => false,
      wasInstallHandled: false,
      debugInfo,
    };
  }

  return {
    canInstall: promptAvailable || hasInstallPrompt(),
    isAndroid: isAndroidDevice && !wasInstallHandled,
    showIOSInstructions: isIOSDevice && !wasInstallHandled,
    install,
    wasInstallHandled,
    debugInfo,
  };
}

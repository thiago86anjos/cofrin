import { Platform } from 'react-native';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Variável global para armazenar o prompt
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let isInitialized = false;

/**
 * Inicializa o PWA - registra service worker e captura beforeinstallprompt
 * Deve ser chamado uma vez no App.tsx
 */
export function initPWA(): void {
  if (Platform.OS !== 'web' || isInitialized) {
    return;
  }
  
  if (typeof window === 'undefined') {
    return;
  }

  isInitialized = true;
  console.log('[PWA] Inicializando...');

  // Captura o evento beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    console.log('[PWA] ✅ beforeinstallprompt capturado!');
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    // Salva globalmente também
    (window as any).deferredPWAPrompt = deferredPrompt;
    // Dispara evento customizado
    window.dispatchEvent(new Event('pwa-prompt-ready'));
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] ✅ App instalado!');
    deferredPrompt = null;
    (window as any).deferredPWAPrompt = null;
  });

  // Registra o service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[PWA] ✅ Service Worker registrado:', registration.scope);
      })
      .catch((error) => {
        console.error('[PWA] ❌ Service Worker falhou:', error);
      });
  } else {
    console.log('[PWA] ⚠️ Service Worker não suportado');
  }
}

/**
 * Retorna o prompt de instalação capturado
 */
export function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt || (window as any)?.deferredPWAPrompt || null;
}

/**
 * Dispara o prompt de instalação
 */
export async function triggerInstallPrompt(): Promise<boolean> {
  const prompt = getDeferredPrompt();
  
  if (!prompt) {
    console.log('[PWA] ⚠️ Prompt não disponível');
    return false;
  }

  try {
    console.log('[PWA] Disparando prompt...');
    await prompt.prompt();
    const result = await prompt.userChoice;
    console.log('[PWA] Resultado:', result.outcome);
    
    // Limpa após uso
    deferredPrompt = null;
    (window as any).deferredPWAPrompt = null;
    
    return result.outcome === 'accepted';
  } catch (error) {
    console.error('[PWA] Erro ao instalar:', error);
    return false;
  }
}

/**
 * Verifica se o prompt está disponível
 */
export function hasInstallPrompt(): boolean {
  return getDeferredPrompt() !== null;
}

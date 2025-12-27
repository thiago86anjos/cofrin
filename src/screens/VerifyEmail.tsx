import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { resendEmailVerification, logout } from '../services/auth';
import { useAuth } from '../contexts/authContext';

const BG_COLOR = 'rgb(108 42 143)';
const PRIMARY = '#28043b';
const BODY = '#322438';

export default function VerifyEmail() {
  const { user, refreshUser, isOnline } = useAuth();
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [resendCooldownUntil, setResendCooldownUntil] = useState<number>(0);
  const [resendSecondsLeft, setResendSecondsLeft] = useState<number>(0);

  const email = useMemo(() => user?.email ?? '', [user?.email]);

  useEffect(() => {
    if (!resendCooldownUntil) {
      setResendSecondsLeft(0);
      return;
    }

    const update = () => {
      const msLeft = resendCooldownUntil - Date.now();
      setResendSecondsLeft(msLeft > 0 ? Math.ceil(msLeft / 1000) : 0);
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [resendCooldownUntil]);

  function mapAuthError(err: any) {
    const code: string = err?.code || '';
    if (code.includes('auth/too-many-requests')) {
      return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.';
    }
    if (code.includes('auth/quota-exceeded')) {
      return 'Limite de envio atingido no momento. Tente novamente mais tarde.';
    }
    if (code.includes('auth/network-request-failed')) {
      return 'Sem conexão. Verifique sua internet e tente novamente.';
    }
    return err?.message || 'Não foi possível concluir a ação. Tente novamente.';
  }

  async function handleResend() {
    if (!isOnline) {
      setMessage('Você está offline. Conecte-se à internet para reenviar o e-mail.');
      return;
    }

    if (resendSecondsLeft > 0) {
      setMessage(`Aguarde ${resendSecondsLeft}s para reenviar novamente.`);
      return;
    }

    setMessage(null);
    setSending(true);
    try {
      await resendEmailVerification();
      setResendCooldownUntil(Date.now() + 60_000);
      setMessage('E-mail de verificação reenviado. Confira sua caixa de entrada e a pasta de spam.');
    } catch (err: any) {
      setMessage(mapAuthError(err));
    } finally {
      setSending(false);
    }
  }

  async function handleCheck() {
    if (!isOnline) {
      setMessage('Você está offline. Conecte-se à internet para atualizar o status.');
      return;
    }

    setMessage(null);
    setChecking(true);
    try {
      await refreshUser();
      // Caso ainda não esteja verificado, mostrar feedback explícito.
      const { auth } = await import('../services/firebase');
      const stillNotVerified = !!auth.currentUser && auth.currentUser.emailVerified === false;
      if (stillNotVerified) {
        setMessage('Ainda não identificamos a verificação. Confirme se você abriu o link no mesmo e-mail e tente novamente.');
      }
    } catch (err: any) {
      setMessage(err?.message || 'Não foi possível atualizar. Tente novamente.');
    } finally {
      setChecking(false);
    }
  }

  async function handleLogout() {
    setMessage(null);
    try {
      await logout();
    } catch {
      // ignore
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="piggy-bank" size={32} color="#fff" />
            </View>
            <Text style={styles.appName}>Cofrin</Text>
          </View>
          <Text style={styles.tagline}>Verificação de e-mail</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ative sua conta</Text>

          <Text style={styles.paragraph}>
            Para começar a usar o Cofrin, precisamos que você confirme seu e-mail.
          </Text>

          <View style={styles.emailRow}>
            <MaterialCommunityIcons name="email-outline" size={18} color={PRIMARY} />
            <Text style={styles.emailText} numberOfLines={1}>
              {email || '—'}
            </Text>
          </View>

          <View style={styles.noticeBox}>
            <MaterialCommunityIcons name="information" size={18} color={PRIMARY} />
            <Text style={styles.noticeText}>
              Abra o e-mail de verificação e clique no link. Depois volte aqui e toque em “Já verifiquei”.
              {'\n'}
              Se não encontrar, verifique a caixa de spam. O título do e-mail pode ser: “Confirme seu e-mail e comece a usar o Cofrin”.
            </Text>
          </View>

          {message ? <Text style={styles.message}>{message}</Text> : null}

          <Pressable
            onPress={handleCheck}
            disabled={checking || sending}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed, (checking || sending) && styles.buttonDisabled]}
          >
            {checking ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator color="#fff" />
                <Text style={[styles.primaryButtonText, { marginLeft: 8 }]}>Verificando...</Text>
              </View>
            ) : (
              <View style={styles.buttonContent}>
                <MaterialCommunityIcons name="check" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.primaryButtonText}>Já verifiquei</Text>
              </View>
            )}
          </Pressable>

          <Pressable
            onPress={handleResend}
            disabled={sending || checking || resendSecondsLeft > 0}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed, (sending || checking) && styles.buttonDisabled]}
          >
            {sending ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator color={PRIMARY} />
                <Text style={[styles.secondaryButtonText, { marginLeft: 8 }]}>Reenviando...</Text>
              </View>
            ) : (
              <View style={styles.buttonContent}>
                <MaterialCommunityIcons name="send" size={20} color={PRIMARY} style={{ marginRight: 8 }} />
                <Text style={styles.secondaryButtonText}>
                  {resendSecondsLeft > 0 ? `Reenviar e-mail (${resendSecondsLeft}s)` : 'Reenviar e-mail'}
                </Text>
              </View>
            )}
          </Pressable>

          <Pressable onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Sair</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#F7F6F2',
    borderRadius: 16,
    padding: 24,
    marginTop: 16,
    marginBottom: 32,
    ...Platform.select({
      web: {
        maxWidth: 460,
        alignSelf: 'center',
        width: '100%',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: PRIMARY,
    textAlign: 'center',
    marginBottom: 16,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 20,
    color: BODY,
    textAlign: 'center',
    marginBottom: 14,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  emailText: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY,
  },
  noticeBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: BODY,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    color: BODY,
    textAlign: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: PRIMARY,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.12)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButtonText: {
    color: PRIMARY,
    fontWeight: '600',
    fontSize: 15,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  logoutButton: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 10,
  },
  logoutText: {
    color: BODY,
    fontSize: 14,
    fontWeight: '600',
  },
});

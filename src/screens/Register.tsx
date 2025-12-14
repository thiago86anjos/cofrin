import { useState } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    Alert,
    ActivityIndicator,
    StyleSheet,
    Platform,
    ScrollView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { register, sendPasswordReset } from "../services/auth";
import { useGoogleAuth } from "../services/googleAuth";
import { palette, spacing, borderRadius } from "../theme";

// Mesma cor da tela de Login
const REGISTER_COLORS = {
  primary: '#0d9488',
  primaryDark: '#0f766e',
  primaryLight: '#14b8a6',
};

export default function Register({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordHelper, setShowPasswordHelper] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);

  const { request, promptAsync } = useGoogleAuth();

  function validateEmail(email: string) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  }

  function isPasswordStrong(pw: string) {
    const re = /^(?=.*[a-z])(?=.*[A-Z]).{6,}$/;
    return re.test(pw);
  }

  async function handleRegister() {
    setError(null);

    if (!email.trim() || !validateEmail(email)) {
      setError("Por favor insira um email válido.");
      return;
    }

    if (!isPasswordStrong(password)) {
      setError(
        "A senha precisa ter pelo menos 6 caracteres, com letra maiúscula e minúscula."
      );
      return;
    }

    setLoading(true);
    try {
      await register(email.trim(), password);
      Alert.alert("Conta criada com sucesso!");
      navigation.goBack();
    } catch (err: any) {
      const code: string = err?.code || "";
      let message = err?.message || "Ocorreu um erro ao tentar registrar a conta.";

      if (code.includes("auth/email-already-in-use")) {
        message = "Esse email já está em uso. Tente recuperar a senha ou use outro email.";
      } else if (code.includes("auth/weak-password")) {
        message = "Senha fraca. Use no mínimo 6 caracteres e inclua letra maiúscula e minúscula.";
      } else if (code.includes("auth/invalid-email")) {
        message = "Email inválido. Verifique o formato do e-mail.";
      } else if (code.includes("auth/network-request-failed")) {
        message = "Sem conexão. Verifique sua internet e tente novamente.";
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendResetEmail() {
    setResetResult(null);
    setResetLoading(true);
    try {
      const targetEmail = resetEmail.trim() || email.trim();
      if (!validateEmail(targetEmail)) {
        setResetResult("Por favor insira um email válido para recuperação.");
        return;
      }

      await sendPasswordReset(targetEmail);
      setResetResult("Link de recuperação enviado. Verifique sua caixa de entrada.");
      setShowResetForm(false);
    } catch (err: any) {
      const code: string = err?.code || "";
      let message = err?.message || "Erro ao enviar o link de recuperação.";
      if (code.includes("auth/user-not-found")) {
        message = "Usuário não encontrado. Verifique o email informado.";
      } else if (code.includes("auth/invalid-email")) {
        message = "Email inválido. Verifique o formato do e-mail.";
      } else if (code.includes("auth/network-request-failed")) {
        message = "Sem conexão. Verifique sua internet e tente novamente.";
      }
      setResetResult(message);
    } finally {
      setResetLoading(false);
    }
  }

  async function handleGoogleRegister() {
    setError(null);
    if (!request) return;
    promptAsync();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header com ícone */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="piggy-bank" size={56} color="#fff" />
        </View>
        <Text style={styles.appName}>Criar Conta</Text>
        <Text style={styles.tagline}>
          Comece a organizar suas finanças{'\n'}de forma simples e prática
        </Text>
      </View>

      {/* Card de Registro */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Preencha seus dados</Text>

        <View style={styles.inputContainer}>
          <MaterialCommunityIcons name="email-outline" size={20} color={palette.textMuted} style={styles.inputIcon} />
          <TextInput
            placeholder="Email"
            placeholderTextColor={palette.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            editable={!loading}
          />
        </View>

        <View style={styles.inputContainer}>
          <MaterialCommunityIcons name="lock-outline" size={20} color={palette.textMuted} style={styles.inputIcon} />
          <TextInput
            placeholder="Senha"
            placeholderTextColor={palette.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            editable={!loading}
          />
          <Pressable
            onPress={() => setShowPasswordHelper((s) => !s)}
            style={styles.infoButton}
            accessibilityLabel="Mostrar ajuda de senha"
          >
            <MaterialCommunityIcons 
              name={showPasswordHelper ? "information" : "information-outline"} 
              size={20} 
              color={REGISTER_COLORS.primary} 
            />
          </Pressable>
        </View>

        {showPasswordHelper && (
          <View style={styles.helperBox}>
            <MaterialCommunityIcons name="shield-check" size={16} color={REGISTER_COLORS.primary} />
            <Text style={styles.helperText}>
              Mínimo 6 caracteres, com letra maiúscula e minúscula
            </Text>
          </View>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          onPress={handleRegister}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.buttonPressed,
            loading && styles.buttonDisabled,
          ]}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.buttonContent}>
              <MaterialCommunityIcons name="account-plus" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.primaryButtonText}>Criar conta</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          onPress={handleGoogleRegister}
          style={({ pressed }) => [
            styles.googleButton,
            pressed && styles.buttonPressed,
            !request && styles.buttonDisabled,
          ]}
          disabled={!request || loading}
        >
          <View style={styles.buttonContent}>
            <MaterialCommunityIcons name="google" size={20} color={palette.text} style={{ marginRight: 8 }} />
            <Text style={styles.googleButtonText}>Continuar com Google</Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => { setShowResetForm(!showResetForm); if (!showResetForm) setResetEmail(email); }}
          style={styles.linkContainer}
        >
          <Text style={styles.linkText}>{showResetForm ? "Fechar" : "Esqueceu sua senha?"}</Text>
        </Pressable>

        {showResetForm && (
          <View style={styles.resetContainer}>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="email-outline" size={20} color={palette.textMuted} style={styles.inputIcon} />
              <TextInput
                placeholder="Digite seu e-mail"
                placeholderTextColor={palette.textMuted}
                value={resetEmail}
                onChangeText={setResetEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
              />
            </View>
            <Pressable
              onPress={handleSendResetEmail}
              style={({ pressed }) => [
                styles.resetButton,
                pressed && styles.buttonPressed,
                resetLoading && styles.buttonDisabled
              ]}
              disabled={resetLoading}
            >
              {resetLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.resetButtonText}>Enviar link de recuperação</Text>
              )}
            </Pressable>
            {resetResult && <Text style={styles.resultText}>{resetResult}</Text>}
          </View>
        )}

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable onPress={() => navigation.goBack()} style={styles.loginButton}>
          <Text style={styles.loginText}>
            Já tem conta? <Text style={styles.loginTextBold}>Fazer login</Text>
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: REGISTER_COLORS.primary,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 24,
  },
  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...Platform.select({
      web: {
        boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.15)',
      },
      default: {
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
    }),
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: palette.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.grayLight,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: palette.text,
  },
  infoButton: {
    padding: 4,
  },
  helperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  helperText: {
    color: REGISTER_COLORS.primaryDark,
    fontSize: 12,
    marginLeft: spacing.sm,
    flex: 1,
  },
  primaryButton: {
    backgroundColor: REGISTER_COLORS.primary,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
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
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  googleButtonText: {
    color: palette.text,
    fontWeight: '600',
    fontSize: 15,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  linkContainer: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  linkText: {
    color: REGISTER_COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  resetContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  resetButton: {
    backgroundColor: REGISTER_COLORS.primaryLight,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  resultText: {
    color: palette.textSecondary,
    fontSize: 13,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  error: {
    color: palette.danger,
    marginBottom: spacing.sm,
    textAlign: 'center',
    fontSize: 14,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: palette.border,
  },
  dividerText: {
    paddingHorizontal: spacing.md,
    color: palette.textMuted,
    fontSize: 13,
  },
  loginButton: {
    alignItems: 'center',
  },
  loginText: {
    color: palette.textSecondary,
    fontSize: 14,
  },
  loginTextBold: {
    color: REGISTER_COLORS.primary,
    fontWeight: '700',
  },
});

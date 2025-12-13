import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  StyleSheet
} from "react-native";
import { register, sendPasswordReset } from "../services/auth";
import { useGoogleAuth } from "../services/googleAuth";
import { palette } from "../theme";
import Card from "../components/Card";

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
    // Minimum 6 chars, at least 1 uppercase and 1 lowercase
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

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.title}>Criar Conta</Text>

        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={[styles.input, styles.inputMargin]}
          editable={!loading}
        />

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TextInput
            placeholder="Senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={[styles.input, { flex: 1 }]}
            editable={!loading}
          />
          <Pressable
            onPress={() => setShowPasswordHelper((s) => !s)}
            style={{ marginLeft: 8 }}
            accessibilityLabel="Mostrar ajuda de senha"
          >
            <Text style={{ color: "#6b7280", fontSize: 18 }}>ℹ</Text>
          </Pressable>
        </View>

        {showPasswordHelper ? (
          <Text style={styles.helperText}>
            Exemplo: SenhaSegura - mínimo 6 caracteres, incluindo letras maiúsculas e minúsculas
          </Text>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={{ height: 12 }} />

        <Pressable
          onPress={() => setShowResetForm((s) => { if(!s) setResetEmail(email); return !s; })}
          style={styles.linkContainer}
        >
          <Text style={styles.linkText}>{showResetForm ? "Fechar" : "Esqueceu sua senha?"}</Text>
        </Pressable>

        {showResetForm ? (
          <View style={{ marginTop: 12 }}>
            <TextInput
              placeholder="Coloque seu e-mail aqui"
              value={resetEmail}
              onChangeText={setResetEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[styles.input, { marginBottom: 8 }]}
            />
            <Pressable
              onPress={handleSendResetEmail}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
                resetLoading && styles.buttonDisabled,
              ]}
              disabled={resetLoading}
            >
              {resetLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Enviar link</Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {resetResult ? <Text style={styles.helperText}>{resetResult}</Text> : null}

        <View style={{ height: 12 }} />

        <Pressable
          onPress={() => {
            setError(null);
            if (!request) return;
            promptAsync();
          }}
          style={({ pressed }) => [
            styles.ghostButton,
            pressed && styles.buttonPressed,
            !request && styles.buttonDisabled,
          ]}
          disabled={!request}
        >
          <Text style={styles.ghostButtonText}>Criar conta com Google</Text>
        </Pressable>

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
            <Text style={styles.primaryButtonText}>Criar conta</Text>
          )}
        </Pressable>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: palette.bg,
  },
  card: {
    padding: 18,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: "center",
    fontWeight: "600",
    color: palette.text,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  inputMargin: {
    marginBottom: 12,
  },
  helperText: {
    color: palette.muted,
    fontSize: 12,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: palette.blue,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  ghostButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  ghostButtonText: {
    color: palette.text,
    fontWeight: "600",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  linkContainer: {
    marginTop: 10,
    alignItems: "center",
  },
  linkText: {
    color: palette.blue,
    fontWeight: "600",
  },
  error: {
    color: "#dc2626",
    marginTop: 8,
    textAlign: "center",
  },
});

 

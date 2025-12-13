import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { login, sendPasswordReset } from "../services/auth";
import { palette } from "../theme";
import Card from "../components/Card";
import { useGoogleAuth } from "../services/googleAuth";

export default function Login({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);

  const { request, promptAsync } = useGoogleAuth();

  async function handleLogin() {
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      const code: string = err?.code || "";
      let message = err?.message || "Ocorreu um erro ao tentar entrar.";

      if (code.includes("auth/user-not-found")) {
        message = "Usuário não encontrado. Verifique seu email.";
      } else if (code.includes("auth/wrong-password")) {
        message = "Senha incorreta. Tente novamente ou recupere a senha.";
      } else if (code.includes("auth/invalid-email")) {
        message = "Email inválido. Verifique o formato do email.";
      } else if (code.includes("auth/network-request-failed")) {
        message = "Sem conexão. Verifique sua internet e tente novamente.";
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError(null);
    if (!request) return;
    setLoading(true);
    try {
      await promptAsync();
    } catch (err: any) {
      setError("Erro ao entrar com Google. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendReset() {
    setResetResult(null);
    setResetLoading(true);
    try {
      const target = resetEmail?.trim() || email?.trim();
      if (!target) {
        setResetResult("Por favor informe o e-mail para recuperação.");
        return;
      }
      await sendPasswordReset(target);
      setResetResult("Link de recuperação enviado. Verifique sua caixa de entrada.");
      setShowReset(false);
    } catch (err: any) {
      const code: string = err?.code || "";
      let message = err?.message || "Erro ao enviar o link de recuperação.";
      if (code.includes("auth/user-not-found")) {
        message = "Usuário não encontrado. Verifique o email informado.";
      }
      setResetResult(message);
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.title}>Entrar</Text>

        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={[styles.input, styles.inputMargin]}
          editable={!loading}
        />

        <TextInput
          placeholder="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={[styles.input, styles.inputMargin]}
          editable={!loading}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={handleLogin}
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
            <Text style={styles.primaryButtonText}>Entrar</Text>
          )}
        </Pressable>

        <View style={{ height: 12 }} />

        <Pressable
          onPress={handleGoogleLogin}
          style={({ pressed }) => [
            styles.ghostButton,
            pressed && styles.buttonPressed,
            !request && styles.buttonDisabled,
          ]}
          disabled={!request || loading}
        >
          <Text style={styles.ghostButtonText}>Entrar com Google</Text>
        </Pressable>

        <View style={{ height: 12 }} />

        <Pressable onPress={() => navigation.navigate("Register")} style={styles.linkContainer}>
          <Text style={styles.linkText}>Criar Conta</Text>
        </Pressable>
        <Pressable
          onPress={() => { setShowReset(!showReset); if (!showReset) setResetEmail(email); }}
          style={styles.linkContainer}
        >
          <Text style={styles.linkText}>{showReset ? "Fechar" : "Esqueceu sua senha?"}</Text>
        </Pressable>

        {showReset ? (
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
              onPress={handleSendReset}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed, resetLoading && styles.buttonDisabled]}
              disabled={resetLoading}
            >
              {resetLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Enviar link</Text>}
            </Pressable>
            {resetResult ? <Text style={styles.helperText}>{resetResult}</Text> : null}
          </View>
        ) : null}
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
  primaryButton: {
    backgroundColor: palette.blue,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
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
    marginBottom: 8,
    textAlign: "center",
  },
  helperText: {
    color: palette.muted,
    fontSize: 12,
    marginTop: 8,
  },
});

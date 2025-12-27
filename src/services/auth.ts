import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    sendPasswordResetEmail,
    signOut,
    updateProfile,
    User,
} from "firebase/auth";

import { auth } from "./firebase";
import { createDefaultCategories } from "./categoryService";
import { createDefaultAccount } from "./accountService";
import { withRetry, reconnectFirestore, checkNetworkConnection } from "../utils/networkUtils";

// Contas manuais criadas a partir desta data exigem verificação de e-mail.
// Contas antigas (existentes) não são afetadas.
const EMAIL_VERIFICATION_ENFORCED_SINCE = new Date('2025-12-27T00:00:00.000Z');

export function shouldRequireEmailVerification(user: User) {
  const isPasswordProvider = user.providerData?.some((p) => p.providerId === 'password');
  if (!isPasswordProvider) return false;
  if (user.emailVerified) return false;

  const createdAt = user.metadata?.creationTime ? new Date(user.metadata.creationTime) : null;
  if (!createdAt || Number.isNaN(createdAt.getTime())) return false;

  return createdAt >= EMAIL_VERIFICATION_ENFORCED_SINCE;
}

export async function register(email: string, password: string) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const userId = userCredential.user.uid;

  // Enviar e-mail de verificação para contas manuais novas.
  // (Login com Google não passa por aqui.)
  try {
    await sendEmailVerification(userCredential.user);
  } catch (error) {
    console.error('Erro ao enviar verificação de e-mail:', error);
  }
  
  // Criar categorias e conta padrão para o novo usuário
  try {
    await Promise.all([
      createDefaultCategories(userId),
      createDefaultAccount(userId),
    ]);
    console.log("Conta padrão e categorias criadas com sucesso para:", userId);
  } catch (error) {
    console.error("Erro ao criar dados iniciais para novo usuário:", error);
    // Mesmo com erro, continuamos o registro
  }
  
  return userCredential;
}

export async function resendEmailVerification() {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');
  await sendEmailVerification(user);
}

export async function login(email: string, password: string) {
  // Verifica conexão e tenta reconectar antes de fazer login
  const isConnected = await checkNetworkConnection();
  
  if (!isConnected) {
    throw { code: 'auth/network-request-failed', message: 'Sem conexão com a internet' };
  }
  
  // Tenta reconectar o Firestore antes do login para garantir estado limpo
  try {
    await reconnectFirestore();
  } catch (e) {
    // Ignora erros de reconexão, tenta login mesmo assim
    console.warn('Aviso: não foi possível reconectar Firestore antes do login');
  }
  
  // Usa retry para lidar com problemas temporários de rede
  return withRetry(
    () => signInWithEmailAndPassword(auth, email, password),
    {
      maxRetries: 2,
      delayMs: 1000,
      onRetry: (attempt, error) => {
        console.log(`Tentativa ${attempt} de login falhou, tentando novamente...`, error?.code);
      },
    }
  );
}

export function sendPasswordReset(email: string) {
  return sendPasswordResetEmail(auth, email);
}

export async function logout() {
  return signOut(auth);
}

export async function updateUserProfile(displayName: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');
  
  await updateProfile(user, { displayName });
  
  // Forçar reload para atualizar o displayName no contexto
  await user.reload();
}

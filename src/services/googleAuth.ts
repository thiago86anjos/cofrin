import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { useEffect } from "react";
import { auth } from "./firebase";

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth(onLogin?: () => void) {

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: "1026415452462-bnqbtkpks7pts26n6l4eg22en1pradau.apps.googleusercontent.com",
    webClientId: "1026415452462-bnqbtkpks7pts26n6l4eg22en1pradau.apps.googleusercontent.com",
    androidClientId: "1026415452462-v95o9cb87b6va3kopvq5sagpsvratmtd.apps.googleusercontent.com",
    iosClientId: "1026415452462-3jti3vafhr81mjkrmftdv11edugdgm42.apps.googleusercontent.com",
    scopes: ["openid", "profile", "email"],
    responseType: "id_token", // <-- ESSENCIAL!
  });

  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;

      console.log("Google Response Params:", response.params);


      const credential = GoogleAuthProvider.credential(id_token);

      signInWithCredential(auth, credential)
        .then(() => {
          console.log("Login Google OK!");

          if (onLogin) onLogin(); // 👈 AGORA o callback funciona!
        })
        .catch((err) => {
          console.error("Erro no login Google:", err);
        });
    }
  }, [response]);

  return { request, promptAsync };
}
// app.config.js - Configuração dinâmica do Expo
// Permite injetar variáveis de ambiente em build time

module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      groqApiKey: process.env.EXPO_PUBLIC_GROQ_API_KEY || '',
    },
  };
};

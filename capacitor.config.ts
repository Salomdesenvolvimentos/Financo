import { CapacitorConfig } from '@capacitor/cli';

// URL do seu app em produção (Vercel).
// O app Android carrega diretamente essa URL no WebView.
// Troque pelo endereço real antes de gerar o APK.
const PRODUCTION_URL = process.env.CAPACITOR_SERVER_URL ?? 'https://financo-beta.vercel.app/';

const config: CapacitorConfig = {
  appId: 'com.financo.app',
  appName: 'Financo',
  webDir: 'out', // Usado apenas se não houver server.url
  server: {
    // Aponta para o Vercel — o app Android carrega o site de produção.
    // Isso elimina a necessidade de build estático e mantém sempre atualizado.
    url: PRODUCTION_URL,
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0f172a',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
};

export default config;

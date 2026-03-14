import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.financo.app',
  appName: 'Financo',
  // 'out' é o diretório gerado pelo next build com output: 'export'
  webDir: 'out',
  android: {
    // Permite que WebView acesse a URL da API de produção via HTTPS
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

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.studylm.app',
  appName: 'StudyLM',
  webDir: 'dist',

  backgroundColor: '#0a1628',

  android: {
    backgroundColor: '#0a1628',
    allowMixedContent: false,
    buildOptions: {
      releaseType: 'APK',
    },
  },

  server: {
    androidScheme: 'https',
  },

  plugins: {
    CapacitorHttp: {
      // Routes all fetch/XHR through native HTTP on Android/iOS, bypassing
      // WebView CORS restrictions. Fixes R2 model loading + document uploads.
      enabled: true,
    },
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#0a1628',
      androidSplashResourceName: 'splash',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a1628',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true,
    },
  },
};

export default config;

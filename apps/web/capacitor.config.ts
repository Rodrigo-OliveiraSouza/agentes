import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.gov.esinapir',
  appName: 'E-SINAPIR',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;

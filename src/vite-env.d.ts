/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENAI_API_KEY?: string;
  readonly VITE_API_ORIGIN?: string;
  readonly VITE_JITSI_DOMAIN?: string;
  readonly VITE_PUBLIC_SITE_URL?: string;
  readonly VITE_SUPPORT_EMAIL?: string;
  readonly BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __APP_VERSION__: string;

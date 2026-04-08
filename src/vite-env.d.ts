/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ANDROID_LOCAL_AI_MANIFEST_URL?: string;
  readonly VITE_ANDROID_LOCAL_GGUF_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

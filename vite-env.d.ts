/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly GEMINI_API_KEY?: string;
  readonly API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace NodeJS {
  interface ProcessEnv {
    readonly GEMINI_API_KEY?: string;
    readonly API_KEY?: string;
  }
}

declare const process: {
  env: {
    GEMINI_API_KEY?: string;
    API_KEY?: string;
  };
};


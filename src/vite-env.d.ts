/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend origin without `/api`, e.g. `https://api.example.com`. Empty = same origin (dev proxy / nginx). */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

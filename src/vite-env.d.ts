/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_GITHUB_CLIENT_ID: string
  readonly VITE_OAUTH_PROXY_URL: string
  readonly VITE_GITHUB_REPO: string
  readonly VITE_GITHUB_BRANCH: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

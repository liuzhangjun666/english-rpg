declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare global {
  interface Window {
    __VUE_MIGRATION_ACTIVE__?: boolean;
    __legacyGame?: any;
  }
}

export {};

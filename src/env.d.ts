/// <reference types="astro/client" />

declare global {
  interface Window {
    /** Флаг Sveltia CMS: не запускаться самому, мы настроим редактор вручную. */
    CMS_MANUAL_INIT?: boolean;
  }
}

export {};

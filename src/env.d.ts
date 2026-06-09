/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly SITE_ID: string;
  readonly FTM_API_BASE: string;
  readonly FTM_SITE_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

---
"fancy-ui-svelte": patch
---

Docs: lock the localization system down — a CI parity gate (`pnpm check:i18n`) plus compile-time key checking (`satisfies Catalog`) across all 16 catalogs, typed `tCategory()`/`docTitle()` helpers replacing five unchecked casts and six hand-built title strings, and translated category/status badges in the component gallery (they were stuck in English next to translated headings).

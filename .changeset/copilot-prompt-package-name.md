---
"fancy-ui-svelte": patch
---

Fix the Component Copilot system prompt: it taught the wrong install command (`pnpm add fancy-ui` / `import … from 'fancy-ui'`) instead of the real package `fancy-ui-svelte`, and a hardcoded "60+ components" that had drifted from the registry. The count is now derived from the registry so it never drifts again, and the prompt now documents the required `@import "fancy-ui-svelte/tailwind.css";` stylesheet line without which Tailwind generates none of the component classes. Docs-site only — no change to the published component API.

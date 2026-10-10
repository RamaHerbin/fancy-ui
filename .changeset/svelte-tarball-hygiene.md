---
"fancy-ui-svelte": patch
---

The published tarball no longer ships the test suites, test harnesses, the scaffold template, the per-folder READMEs or the Web Audio test mock (0.14.0 carried 566 test files). Component imports inside the package now use explicit `.js` specifiers, so `dist` resolves under strict ESM resolvers as well as bundlers.

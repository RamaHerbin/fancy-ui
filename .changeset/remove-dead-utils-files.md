---
"fancy-ui-svelte": patch
---

Remove dead files from the published package: `utils/color`, `utils/geometry` and the `utils/index` barrel shipped in the tarball but were unreachable through the package exports and unused by every component. `utils/animation` (used by NoiseReveal) still ships.

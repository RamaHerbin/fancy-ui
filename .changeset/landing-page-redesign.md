---
"fancy-ui-svelte": patch
---

Landing page: rebuild the marketing page from the design system — a sticky header, a hero with gradient type over the HDR FluidCursor simulation, a feature-chip row, a component showcase, a component index strip, an interactive install section (package-manager tabs with copy-to-clipboard), a detailed "See FancyUI in action." gallery with three full app previews, and a values strip. The page is now composed of focused section components under `src/lib/components/landing/` instead of one long route file, and every navigation target points at a route that exists. Docs-site only — no change to the published component API.

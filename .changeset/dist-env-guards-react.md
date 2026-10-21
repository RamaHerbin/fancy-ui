---
"fancy-ui-react": patch
---

Development-only diagnostics now read `NODE_ENV` as the literal that bundlers replace statically, so the Tooltip, FluidCursor and FireworksHdr warnings work again in browser builds.

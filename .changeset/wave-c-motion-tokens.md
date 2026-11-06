---
"fancy-ui-svelte": patch
"fancy-ui-react": patch
"fancy-ui-vue": patch
---

Exits now decelerate on the shared `out` curve, over the same shorter duration or shallower depth as before, so a dismissal (menus, popovers, dialogs, sheets, drawers, toasts, skeleton fades, removed upload rows) reads immediate instead of delayed; text-roll's wheel is the one departure that keeps accelerating into the next entrance. The `--ft-duration-*`, `--ft-ease-*`, `--ft-stagger-*` and `--ft-hover-in`/`--ft-hover-out` motion tokens are now declared by each package's `tailwind.css`, so one `:root` override retimes the whole library; components keep their fallbacks, so importing a component without the entry is unchanged. Component timings are written against those tokens (a handful of near-rung literals moved to the nearest rung, within 20 %), and staggers share one cap that scales with item size (`staggerCap`): short rows settle in 200 ms, cards in 600 ms, so BlurReveal's children beyond the tenth finally get their delay.

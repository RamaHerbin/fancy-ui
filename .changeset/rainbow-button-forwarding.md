---
"fancy-ui-svelte": patch
"fancy-ui-react": patch
"fancy-ui-vue": patch
---

RainbowButton now honours its public contract: the consumer click handler is called once per activation (never while disabled), native attributes such as `aria-label` and `data-*` are forwarded to the rendered element, and a disabled link is inert (click cancelled, `href` dropped).

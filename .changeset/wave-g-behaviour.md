---
"fancy-ui-svelte": minor
"fancy-ui-react": minor
"fancy-ui-vue": minor
---

Link now underlines its default variant at rest, so an in-text link is no longer told apart by colour alone; `underline="hover"` stays the default value and the muted variant is unchanged. ApprovalCard keeps both buttons focusable while `busy` (they carry `aria-busy` and ignore presses instead of going `disabled`) and announces the verdict through a static `role="status"` region. ContextMenuTrigger gains an opt-in `focusable` prop that makes the region a tab stop with an `aria-description`, so the Menu key and Shift+F10 can reach the menu; it is off by default.

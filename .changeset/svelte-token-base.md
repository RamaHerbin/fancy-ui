---
"fancy-ui-svelte": minor
---

The CSS entry now ships default colour tokens and a dark variant. The 18 semantic colours the components use (`bg-primary`, `border-border`, `bg-popover` and the rest) now produce rules, and `dark:` utilities follow a `.dark` or `.light` ancestor and fall back to the OS preference. Apps that define their own tokens keep them: the defaults are layered, so an unlayered `:root` or `.dark` block wins. If your app switches theme only with a `.dark` class, note that the entry sets `:root { color-scheme: light dark }`: put `light` on `<html>` in light mode, or declare unlayered `:root { color-scheme: light }` and `.dark { color-scheme: dark }` (both are needed), otherwise a dark-OS machine shows dark `light-dark()` branches and scrollbars on a light page. Import the entry before your own `@custom-variant dark`, or it replaces yours. The entry also scans the cameleon skins and shared utilities.

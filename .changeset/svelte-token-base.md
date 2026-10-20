---
"fancy-ui-svelte": minor
---

The CSS entry now ships default colour tokens and a dark variant. The 18 semantic colours the components use (`bg-primary`, `border-border`, `bg-popover` and the rest) now produce rules, and `dark:` utilities follow a `.dark` or `.light` ancestor and fall back to the OS preference. Apps that define their own tokens keep them: the defaults are layered, so an unlayered `:root` or `.dark` block wins. The entry also scans the cameleon skins and shared utilities.

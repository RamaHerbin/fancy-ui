---
"fancy-ui-vue": patch
---

`@click` now reaches Button, IconButton, Link, NavbarLink, SidebarItem, ChatMessageAction, FlipCard (`@flip`) and Compare (`@drag-start`, `@drag-end`, `@hover-enter`, `@hover-leave`, `@percentage-change`), as do the camelCase callbacks of PulseBeam (`@fade-in`, `@fade-out`) and DatamoshTransition (`@covered`, `@revealed`). It no longer fires alongside the lowercase prop on GradientButton, InteractiveHoverButton and RippleButton, and a listener merged from several levels (an array) is accepted. The lowercase props (`onclick`, `onflip`, ...) remain as deprecated aliases.

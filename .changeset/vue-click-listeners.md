---
"fancy-ui-vue": patch
---

`@click` and other camelCase listeners now reach Button, GradientButton, IconButton, InteractiveHoverButton, Link, NavbarLink, RippleButton, SidebarItem and ChatMessageAction, and `@flip`, `@fade-in`, `@fade-out`, `@covered`, `@revealed`, `@percentage-change`, `@drag-start`, `@drag-end`, `@hover-enter` and `@hover-leave` reach FlipCard, PulseBeam, DatamoshTransition and Compare. The lowercase props (`onclick`, `onflip`, ...) remain as deprecated aliases, called only when the camelCase one is absent.

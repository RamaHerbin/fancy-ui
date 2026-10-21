---
"fancy-ui-svelte": patch
"fancy-ui-react": patch
"fancy-ui-vue": patch
---

Link, LineHoverLink, NavbarLink, NavigationMenuLink and InlineCitation now forward native attributes and listeners (`id`, `download`, `hreflang`, `aria-*`, `data-*`, `onkeydown`, `onfocus`, ...) to their anchor, and to the marker of InlineCitation. Managed attributes (`aria-current`, `aria-disabled`, `tabindex`, `target`, `rel`, the marker's label) stay in the component's hands while they apply, an `aria-describedby` you pass is joined with the citation card's id, and your listeners run once, after the component's own logic. LineHoverLink gains an `onclick` prop in Svelte, and NavbarLink, NavigationMenuLink and InlineCitation are now open in React.

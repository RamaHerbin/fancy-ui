---
"fancy-ui-svelte": patch
---

`fancy-ui-svelte/package.json` is now an exported subpath, like in the React and Vue packages, so tooling that reads a package manifest by specifier resolves it instead of hitting the exports map. The README lists the peer range and every exported subpath (the package root, `tailwind.css`, `cameleon`, `cameleon/retro-kit`, the `cameleon/*` wildcard and `package.json`), and the comments in `tailwind.css` now read the same in all three packages; the CSS it compiles to is unchanged.

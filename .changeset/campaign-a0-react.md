---
"fancy-ui-react": patch
---

The comments in `fancy-ui-react/tailwind.css` now describe the token set by what it does rather than where it came from, and match the Svelte and Vue entries word for word; the CSS it compiles to is unchanged. `PORTING.md` gains a "What a consumer imports" section: entry points, `styles.css`, the cameleon subpath, server-rendering rules and the measured cost of importing from the package root.

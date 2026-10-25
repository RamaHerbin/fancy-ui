---
"fancy-ui-svelte": patch
---

Astro setup documented in the README and on the Installation page: the official Svelte integration plus the Tailwind entry, components rendered statically by default, and hydrated components imported through a local `.svelte` file, since a `client:*` directive on a package-root import ships the whole library to the browser. A new consumer app (`examples/consumers/astro`, `pnpm consumers astro`) builds that setup from the packed tarball and checks it in Chromium, `ClientRouter` navigations included. No change to the package itself.

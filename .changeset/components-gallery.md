---
"fancy-ui-svelte": patch
---

`searchComponents()` now also matches a component's tags and ignores surrounding whitespace in the query, through a new `matchesQuery()` helper in the registry. The docs components gallery gets a redesign built on it: real preview thumbnails on every card, category sections, a sticky search and filter bar, and filters kept in the URL.

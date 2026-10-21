---
"fancy-ui-svelte": patch
---

Declare `@sveltejs/kit` as an optional peer dependency. No shipped file imports it (a gate now checks that), so nothing changes at runtime; the entry only silences the packager warning about the docs site code that stays out of the tarball.

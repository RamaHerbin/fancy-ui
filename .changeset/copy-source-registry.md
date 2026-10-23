---
"fancy-ui-svelte": patch
---

Copy-source registries: every item now carries its author and `meta` (MIT licence, the package and version its files were cut from, its docs page), the Svelte index lists `registryDependencies` on every entry as its CLI's schema requires, and the generated indexes and items are validated against the registry CLIs' published JSON Schemas in CI. A new docs page, Getting started → Copy source, covers prerequisites per framework, the add command, updating a copied component, mixing copies with the package, dark mode and what the registries leave out.

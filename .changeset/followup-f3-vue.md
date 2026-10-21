---
"fancy-ui-vue": minor
---

New `Badge` and `Avatar`, ported from the Svelte package with the same props, classes and behaviour. `Badge` is a short status pill in five variants (`default`, `secondary`, `outline`, `destructive`, `success`) and two sizes, with the label in the default slot. `Avatar` shows an image behind a skeleton while it loads and falls back to one or two initials, on a colour that is always the same for the same name, when there is no image or it fails; it is named by `alt` (or `name`) and is decorative when `alt=""`. Both pass native attributes and listeners through to the root `<span>`.

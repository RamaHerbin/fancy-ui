---
"fancy-ui-svelte": minor
---

New `Badge` and `Avatar`. `Badge` is a short status pill in five variants (`default`, `secondary`, `outline`, `destructive`, `success`) and two sizes. `Avatar` shows an image behind a skeleton while it loads and falls back to one or two initials, on a colour that is always the same for the same name, when there is no image or it fails; it is a circle or a rounded square in three sizes, is named by `alt` (or `name`), and is decorative when `alt=""`. Both pass native `<span>` attributes and listeners through to the root.

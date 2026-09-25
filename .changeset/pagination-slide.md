---
"fancy-ui-svelte": patch
---

Pagination: the current-page pill now slides from the old number to the new one instead of jumping, and when the visible run of numbers shifts (a jump opens a new window, an ellipsis moves) the numbers glide to their new places while new ones fade in, so the pill lands with its number. It replaces the old one-off pop. The slide never plays on first paint, follows controlled `page` changes too, and snaps on resize. The current button keeps `aria-current` and its own fill until the pill has actually been placed, so nothing is lost without JS. Tune it with `--ft-pagination-slide-duration` (the old `--ft-pagination-pop-duration` still works as a fallback) and `--ft-pagination-indicator-color`. Under reduced motion the pill and the numbers still follow the page, without travelling.

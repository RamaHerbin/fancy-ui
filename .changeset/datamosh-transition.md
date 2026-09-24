---
"fancy-ui-svelte": minor
---

Add DatamoshTransition, a page-transition overlay that looks like a corrupted video decode: a fixed grid of columns, narrow on the left and wide on the right, fills with flat blocks of saturated colour that fall, stretch open through the middle of the frame and squeeze shut again. `cover()` drops the columns over the page right to left, `reveal()` lets them fall away; both return promises, so the overlay slots into any router's navigation hook. Reduced motion covers and clears instantly on one still frame. Four cover shapes (`variant`: curtain, rise, split, interlace), five column orders (`sweep`: right, left, center, edges, random) and five palette presets (`colors`: broadcast, sunset, thermal, mono, acid). `source` decodes a picture instead: the tiles take their colours from an image, a canvas or a URL.

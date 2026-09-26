---
"fancy-ui-svelte": minor
"fancy-ui-react": minor
---

ImageTrailCursor: nine new trail variants. `scale` pops each image in with a bouncy scale and shrinks it away behind the cursor; `fall` springs it in, spins it and drops it out through the bottom edge; `gravity` throws it sideways with the pointer, lands it on the bottom edge and bounces it twice; `flame` flickers it in and lets it rise as it burns away, tilting harder the faster the pointer moves. Five reveals draw each picture from fragments that open and close in sequence: `venetian` (slats, top to bottom), `curtain` (strips from their centre line), `hexagon` (a honeycomb growing from the centre), `liquid` (swelling blobs) and `zoom-split` (quadrants flying out of the centre). `fall` and `gravity` measure the container's height, so give it a height and `overflow-hidden`.

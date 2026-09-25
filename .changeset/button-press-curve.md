---
"fancy-ui-svelte": patch
"fancy-ui-react": patch
---

Button: the press bites. Holding the button still scales it to 0.97 over 150 ms, but the down-stroke now runs on the arrival curve instead of the reversible-state one, so the scale lands in the first frames; the release keeps the softer curve and settles. The React button gains the press it never had, along with the colour channel the Svelte source moved into CSS, so the two now behave the same on click.

---
"fancy-ui-svelte": patch
---

InteractiveHoverButton: a more polished hover. The dot beside the label now opens into a circle that fills the button (a clip-path, crisp at every size, instead of scaling a 2 px dot a hundredfold). The resting label rolls up and out with a slight blur, and the hover label rolls up into place with its arrow a beat behind; leaving reverses at once. Keyboard focus plays the same animation. The fill colours are now CSS variables, `--ihb-fill` and `--ihb-fill-foreground`, settable from `class` (for example `[--ihb-fill:#ef4444]`); styles that reached into the old markup (`[&_div>.size-2]`, `[&>div:last-child]`) need to move to them. Reduced motion still gets the hover state, without the travel.

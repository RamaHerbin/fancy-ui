---
"fancy-ui-svelte": patch
"fancy-ui-react": patch
"fancy-ui-vue": patch
---

Slider: the purple-to-cyan fill is replaced by a single beam of light. The fill now fades in from the left edge and brightens into a solid thumb with a soft glow — warm white on dark surfaces, near-black ink on light ones. The rail is a 2px hairline, keyboard focus adds a crisp ring around the thumb, and `--ft-accent` still retints the whole control. While the slider is hovered, focused or dragged, a short glint travels along the fill towards the thumb. The thumb springs larger on hover and further on grab, and the value bubble lifts while it is held. All of this motion is off under `prefers-reduced-motion`. The internal `--ft-slider-accent-end` variable is gone.

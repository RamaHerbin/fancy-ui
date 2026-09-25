---
"fancy-ui-svelte": patch
---

RippleButton: a more refined ripple. Each click now sends a ripple of light from the click point: a soft glow that blooms and fades, and two fine rings spreading out a beat apart, like a wave on water, reaching every corner of the button. While it runs, the border takes the ripple's tint. A keyboard press (Enter or Space) now ripples from the centre instead of the top-left corner. Hovering adds a fingertip-over-water effect: a soft glow follows the pointer and a faint ring keeps pulsing out from it. The face is lighter too: a 1 px border, a fine top highlight and a slight press. Defaults moved to fit: `rippleColor` `#60a5fa` (was `#ADD8E6`, which barely showed on a light page) and `duration` 900 ms (was 600). Reduced motion keeps only a brief glow where you pressed, and a still hover glow.

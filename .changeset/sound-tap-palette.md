---
"fancy-ui-svelte": patch
"fancy-ui-react": patch
"fancy-ui-vue": patch
---

Sound design refresh.

- New default palette: every gesture cue is a short tactile tap (a single oscillator whose pitch falls a couple of octaves under a natural exponential decay) instead of a pitched beep over a noise transient. Success keeps a quiet two-note bell.
- Button-family components (`Button` and `IconButton`, `GradientButton`, `RainbowButton`, `RippleButton`, `ShimmerButton`, `InteractiveHoverButton`, `ConfettiButton`) now also play the `hover` cue when a mouse or pen enters, through the same movement-gated binding as `soundFeedback`, when their `sound` prop is set.
- Engine: cue recipes gain two optional fields, `envelope.curve` (`"linear"` | `"exponential"`) and `glide` on oscillator layers. The master limiter now only engages near full scale, so it no longer softens the attack of short cues.
- Fix: a decay segment could be scheduled as a flat hold (no decay at all) when floating-point rounding put the release start a hair before the decay end.

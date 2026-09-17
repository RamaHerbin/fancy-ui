---
"fancy-ui-svelte": patch
"fancy-ui-react": patch
---

FluidCursor: clicking no longer brightens the fluid forever when `fluidColor` or `fluidColors` is set. A click scaled the colour it was handed _in place_, and with a palette configured that colour is the cached palette entry itself — so every click multiplied the palette by ten again: the fifth click painted with a colour ten thousand times brighter, a few more overflowed to NaN and the fluid went blank. Random colours are fresh objects, which is why the default palette never showed it. The click now scales a copy, and the cached palette entries are frozen so a future in-place edit fails loudly instead of compounding.

Two smaller click changes ride along. The click boost is now `min(10, 1.5 / colorIntensity)` instead of a flat ×10 on top of the already intensity-scaled colour, so raising `colorIntensity` — which the dither mode asks you to do — no longer raises the click's peak with it; the default intensity is byte-identical. And a click now _lifts_ each texel to its own profile rather than adding to it, so a burst of clicks on one spot paints the same disc once instead of summing towards white. Move splats are unchanged and still additive. No prop was added.

Also on the WebGL path (Svelte): unmounting now deletes the engine's programs, shaders, textures, framebuffers and buffers and loses the context, instead of leaving a whole simulation's worth of GPU memory to the garbage collector and one more live context in the browser's budget on every re-key. And on all four engines, `mouseup` / `touchend` / `touchcancel` now mark the pointer released — `down` used to stay `true` for the life of the engine.

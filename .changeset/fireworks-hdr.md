---
"fancy-ui-svelte": minor
---

FireworksHdr: new component — a GPU fireworks engine that renders shells into an HDR accumulation buffer, with a WebGPU path (float16 + display-p3 + extended tone mapping) and a WebGL2 fallback that resolves to display-p3 or plain sRGB. Ambient shells schedule themselves on a Poisson cadence inside weighted zones, avoid a caller-supplied keep-clear rect, and adapt their render scale and spawn density to the measured frame time; `prefers-reduced-motion` turns the scheduler off while imperative launches keep working. The `onReady` callback hands over a `FireworksHandle` (`launch`, `setAmbient`, `setKeepClear`, `setExposure`, `renderLevel`, `cleanup`) and an `onLost` callback reports a GPU context loss that could not be recovered. `FireworksHdr`, `FireworksHdrProps`, `FireworksHandle`, `LaunchOptions`, `LaunchResult`, `FireworksRenderLevel`, `ShellKind` and `QualityTier` are exported from the package root.

---
"fancy-ui-svelte": minor
"fancy-ui-react": minor
"fancy-ui-vue": minor
---

Add MagneticField: a field in which every `MagneticItem` is pulled toward a magnet and leans toward the magnet's side, then springs home without overshoot when the magnet leaves. The pull falls off smoothly with the distance from each item's edge, lighter items (`mass`) move and lean more than heavy ones, and `polarity={-1}` repels. The magnet is the pointer by default, a controlled `position`, or a draggable, keyboard-operable `MagnetPuck`. Reduced motion keeps every item at rest. The motion lives in a framework-free core shared by the Svelte, React and Vue packages.

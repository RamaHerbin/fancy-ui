---
"fancy-ui-svelte": minor
---

NeonBorder: a real neon tube. A faint two-colour tube now runs all the way round the content, and two beams, one per colour, chase each other along it from opposite sides, each with a white-hot core and a glow that spills both inside and outside the edge. The tube flickers once as it ignites, then the glow hums with a slow breathing. `animationType` keeps its meaning (`none`: two lit corners; `half`: short beams; `full`: long beams). The container no longer clips its overflow (the glow would be cut off), and the inner `.neon-layer-one` / `.neon-layer-two` elements are replaced by `.neon-tube`, `.neon-glow` and `.neon-core`; the animation class `neon-animated` now sits on the container. Light pages get a fainter glow. Reduced motion stops the travel, the flicker and the hum.

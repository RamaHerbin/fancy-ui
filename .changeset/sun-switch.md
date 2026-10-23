---
"fancy-ui-svelte": minor
"fancy-ui-react": minor
"fancy-ui-vue": minor
---

Add SunSwitch: a theme switch drawn as a pixel sun. On hover a soft lens follows the pointer and shows the sun's true colours over a monochrome scene; on click the new theme spreads from the sun as a view transition clipped by a grid-aligned staircase, led by a dithered halo in the sun's four colours. The component only reports the new value through `onCheckedChange` (called inside the transition), so any theme system can flip there. Browsers without view transitions, and a `contained` mode scoped to one element, get the same wave painted over a sheet of the old colour. Reduced motion switches instantly. The wave is also exported on its own as `pixelWave()` for any trigger. Rendering and the wave live in framework-free cores shared by the Svelte, React and Vue packages.

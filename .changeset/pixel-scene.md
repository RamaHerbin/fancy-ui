---
"fancy-ui-svelte": minor
"fancy-ui-react": minor
"fancy-ui-vue": minor
---

Add PixelScene: an animated pixel-art landscape painted on a dot grid. At rest only sparse ink dots and the lit cells show; a round lens that follows the pointer reveals the full picture in colour, with a dithered rim. Four scenes (alpine, meadow, sea, mountains), each with complete day and night palettes. On HDR displays the sun, windows, stars, fireflies and the lens are redrawn as hard squares brighter than SDR white in a WebGPU layer, with halos built from dithered cells; nothing is created elsewhere. Reduced motion freezes the scene and snaps the lens. The engine, the scenes and the HDR layer are framework-free cores shared by the Svelte, React and Vue packages.

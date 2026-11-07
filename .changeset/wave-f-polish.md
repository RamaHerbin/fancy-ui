---
"fancy-ui-svelte": patch
"fancy-ui-react": patch
"fancy-ui-vue": patch
---

First-frame and layout polish. Focus now places its bracket frame on the first word without a transition, so it no longer flies in from the corner on mount. StickyScroll swaps its panel instantly for the first two frames, so the panel no longer fades from the wrong row while the observers report which row is centred. NoiseReveal draws nothing until the image has loaded, so a plane that starts revealed no longer flashes a black slab. PixelScene paints its first picture at once instead of on the next animation frame. ChatPanel re-lands the opening scroll on its latest turn as soon as the transcript is measured, before the first paint. NumberTicker and TerminalText reserve their final size from the first frame, with an invisible copy of the widest number and of the whole transcript, so the box no longer recentres or grows while it counts or types. ConfettiButton warns in development when it is given a nested button, link or input, since a button inside a button is invalid markup.

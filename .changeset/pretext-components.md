---
"fancy-ui-svelte": minor
---

Add LineReveal and EditorialEngine components powered by @chenglou/pretext:
LineReveal staggers a line-by-line text reveal with lines computed by canvas
text measurement instead of DOM splitting; EditorialEngine renders a live
magazine layout (multi-column flow with cursor handoff, auto-fitted headline,
drop cap, pullquotes) where text reflows in real time around draggable orbs
with zero DOM reads.

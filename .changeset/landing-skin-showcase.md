---
"fancy-ui-svelte": patch
---

The landing page is now a live demonstration of the skin engine rather than a
marketing page about it.

Eight stacked sections — most of them hand-drawn previews that were never real
components — are replaced by hero, one interactive showcase panel, and the
closing CTA. The panel carries four scenes (Components, Forms, Dashboard, Chat)
built entirely from the cameleon primitives and token-driven surfaces, and a
control in the header re-skins the whole page around them: chrome, headline,
nebula and panel together.

Adds a fifth skin, `aurora` — the library's own near-black canvas and
violet→blue sweep, previously hardcoded into the landing markup and therefore
impossible to switch away from. It implements the full twelve-token contract and
all ten recipes, so it stands alongside brutal, glass, terminal and retro-os on
the `/skins` page.

The landing skin is deliberately not persisted: the route is prerendered and
there is no pre-paint skin bootstrap, so remembering a choice would repaint the
page after hydration. The closing CTA block keeps its own fixed art direction —
its backdrop is a photograph, not a themeable surface.

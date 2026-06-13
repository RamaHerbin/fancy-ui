# Fancy UI — Vision & Roadmap

> Status: living document. Opinionated, meant to be edited as the project evolves.
> Audience: human contributors **and** AI coding agents working on this repo.
> Scope: strategy, positioning, roadmap, documentation. No implementation lives here.

---

## 1. Product vision

**Fancy UI is a creative toolkit for the AI era of the web — premium, motion-first, shader-capable Svelte 5 components that make a site feel alive, shipped with docs an AI agent can read and build from.**

It is not a generic component kit. Buttons, inputs and tables are table stakes other libraries already solve. Fancy UI exists for the *memorable* layer: the hero that moves, the reveal that surprises, the cursor that reacts, the portfolio that feels designed. The components are production-grade (typed, tested, dark-mode aware, SSR-safe), but the goal is emotional: a developer drops one in and the page suddenly looks like it had a designer.

Three commitments hold the vision together:

1. **Beautiful by default.** A component looks finished the moment it renders — no "wire up 6 props to make it presentable" step.
2. **Motion and depth are first-class.** WebGL, shaders, scroll-driven animation and physics are core surface area, not afterthoughts.
3. **AI-readable.** The registry, `llms.txt`/`llms-full.txt`, and per-component docs mean an agent (Claude, Cursor, etc.) can discover, import, and assemble components correctly without guessing export names.

---

## 2. Target audience

- **Creative developers & design engineers** — people who care how it *feels*, building portfolios, landing pages, product launches, experimental interfaces.
- **Frontend engineers** who want a striking hero/section without hand-rolling WebGL.
- **Indie hackers & solo founders** shipping a product page fast that doesn't look like a template.
- **AI-assisted builders** — developers driving an agent ("add a noise-dissolve image reveal here"); the agent needs machine-readable docs to get imports and props right.

Not the primary audience: teams looking for an accessible enterprise design system (forms, data grids, RBAC tables). Fancy UI can be used *alongside* shadcn-svelte / Bits UI, not as a replacement for them. That boundary is a feature, not a gap.

---

## 3. Where Fancy UI stands today (honest snapshot)

Already strong, based on the current codebase:

- **~58 components** spanning buttons, cards, backgrounds, text/typography, layout, effects, media, navigation, feedback, data-display.
- **Real WebGL/shader surface**: `fluid-cursor`, `noise-reveal` (WebGL noise-dissolve image reveal), `displacement-text`, `matrix-rain`, `flickering-grid`, `sparkles`.
- **AI-native plumbing already shipped**: `llms.txt` + `llms-full.txt` generated from the registry (export names are read from each component's real `index.ts`, so import examples never lie); an `/api/chat` endpoint with a system prompt; a visual `builder` (editor / renderer / storage / stores).
- **A single source of truth**: `src/lib/fancy-ui/registry.ts` drives demos, docs, and the llms endpoints. This is the project's biggest structural asset — protect it.
- **Engineering discipline**: Svelte 5 runes throughout, Tailwind 4, full TypeScript, Vitest + Testing Library, Playwright e2e, `publint` + registry-parity guard in the package build, changesets-based releases.

Weak spots to be honest about:

- Component **breadth outpaces narrative** — 58 components, but no single page says "this is what Fancy UI is *for*."
- **Signature identity is diffuse.** Many components are recognizably "Aceternity-like." Few are unmistakably "Fancy UI."
- **Docs are demo-first, not recipe-first** — great for "what does X look like", thinner on "compose a landing page from these 5 blocks."
- **No section/block layer yet** — components are atoms; the high-value deliverable (drop-in *sections*) barely exists.

---

## 4. Competitive positioning

### Aceternity UI
- **Does well:** jaw-drop hero moments, marketing-grade visuals, a recognizable aesthetic, strong copy-paste DX.
- **Borrow:** the "wow in one screenshot" bar; the copy-paste-into-your-repo distribution model; naming that sells the effect.
- **Avoid:** React-only lock-in (our edge is Svelte); effect-over-substance components that are hard to make production-safe; heavy per-component dependency sprawl.

### Inspira UI
- **Does well:** it *is* the Vue/Nuxt answer to Aceternity — proof that a framework-native port of the aesthetic wins an audience; clean docs; good categorization.
- **Borrow:** clear category structure; framework-native idioms (we should feel deeply Svelte, not a React port); momentum from porting proven effects.
- **Avoid:** being purely a "port of someone else's catalogue" — that caps the ceiling at "the Svelte version of." We need original signatures.

### Sigma UI
- **Does well:** opinionated, premium, design-forward presentation; treats components as a designed product.
- **Borrow:** premium presentation and a curated (not exhaustive) feel; the idea that *fewer, better, branded* beats *more, generic*.
- **Avoid:** opacity/over-polish that hides how things work; anything that trades developer control for magic.

### Fancy UI's own identity
The wedge no competitor fully owns: **Svelte-native + genuinely shader/WebGL-capable + AI-readable by construction.** Aceternity is React; Inspira is Vue; both lean CSS/Framer-motion more than raw GL. None treat *agent-readability* as a first-class product surface. Fancy UI should lean hard into all three at once — that intersection is the brand.

---

## 5. Component roadmap

Organized by category. Existing components are the foundation; this lists *directions*, not a backlog to implement here.

- **WebGL / shader** (our moat): build out from `fluid-cursor` / `noise-reveal` / `displacement-text` into a coherent family — shader hero backgrounds, GPU particle fields, mesh-gradient surfaces, image transitions, distortion-on-scroll. A shared, documented shader/uniform helper so new GL components are cheap to add.
- **Motion & reveal**: extend `blur-reveal` / `box-reveal` / `line-reveal` into a unified scroll-driven reveal system; add stagger orchestration, scroll-progress primitives, view-transition helpers.
- **Landing-page sections (the missing layer)**: composed blocks — hero, feature grid, bento showcase, pricing, testimonials wall, CTA, footer. This is the highest-leverage gap.
- **AI-native components**: a polished AI command palette / prompt panel, streaming chat surface, "generative" loading states, agent-action toasts — productizing what `/api/chat` already hints at.
- **Portfolio / creative-coding blocks**: project showcase grid, case-study scroller, animated about/timeline, creative nav. (`portfolio` lib already exists — formalize it.)
- **Docs & registry**: recipes, composition guides, copy-paste section snippets (see §6–7).
- **DX**: CLI/registry install flow, shadcn-style "add component" ergonomics (see §7).

---

## 6. Documentation roadmap

The registry is the spine — every doc surface should generate from it so they never drift.

- **Per-component pages**: keep demo-first, but add a "Recipes" tab — real compositions, not just prop tables.
- **Section/recipe docs**: "Build a landing page in 5 blocks" — the narrative that turns atoms into outcomes.
- **`llms.txt` / `llms-full.txt`**: already strong. Next: per-component `llms` fragments, prop schemas in machine-readable form, and "common composition" hints so agents assemble sections, not just single components.
- **Getting-started**: tighten the install → import → render path; make the SSR/WebGL caveats explicit (client-only render for GL components).
- **A `CLAUDE.md`-style agent guide** for *consumers* of the library (distinct from this repo's contributor `CLAUDE.md`): "how an AI agent should pick and wire Fancy UI components."
- **Human + agent parity**: every example a human reads should exist in a form an agent can parse.

---

## 7. Registry / DX roadmap

- **`add` flow**: a shadcn-svelte-style CLI (or `npx`-able registry) so users pull component *source* into their repo, not just an npm import. The copy-paste-ownership model is what made Aceternity/shadcn spread.
- **Registry as public API**: expose the registry (and per-component metadata: deps, exports, category, GL-or-not) as a queryable JSON endpoint for tooling and agents.
- **Parity guards**: the existing registry-parity / `publint` guard is gold — extend it so a component can't ship without registry entry, demo, docs, and llms coverage.
- **Dependency hygiene**: keep the per-component dependency surface explicit and minimal; document which components pull heavy deps (GL/three) so consumers opt in knowingly.
- **Templates**: `_template` already exists — make scaffolding a new component (folder + registry entry + demo + test + docs stub) a single command.

---

## 8. Signature components (10–15 that should *define* Fancy UI)

Aim: a gallery where half the items are things you can't easily get anywhere else in Svelte. Existing ones marked ✅.

1. **Noise-Dissolve Image Reveal** ✅ — purpose: hero/portfolio image transition. Style: GPU noise dissolve. Complexity: high (WebGL). Why: already shipped, already differentiated — make it the poster child.
2. **Fluid Cursor** ✅ — interactive fluid-sim pointer. WebGL, high. Already a standout; document it as signature.
3. **Shader Hero Background** — full-bleed animated mesh-gradient / flow-field hero. WebGL, high. Why: the single most-wanted "make my landing page wow" block.
4. **Interactive WebGL Hero** — composed hero (shader bg + reveal text + CTA) as one drop-in. High. Why: turns the moat into an outcome.
5. **Shader Card** — card with a live shader surface (foil/holo/flow). Medium-high. Why: cards are universal; a GL card is rare in Svelte.
6. **Displacement Text** ✅ — distortion-driven text effect. Medium-high. Lean into it as a typography signature.
7. **AI Command Panel** — ⌘K prompt/command surface with streaming. Medium. Why: every AI-era app wants one; ties to `/api/chat`.
8. **Animated Project Showcase** — scroll-driven case-study/portfolio scroller. Medium. Why: anchors the portfolio audience.
9. **Creative Portfolio Grid** — bento + hover-reveal project grid. Medium. Why: most-requested portfolio block.
10. **Glass / Depth Navigation** — `liquid-glass`-based nav with depth/blur. Medium. (`liquid-glass` exists — productize into a nav.)
11. **Scroll-Driven Storytelling Section** — pinned, progress-linked narrative section. Medium-high. Why: the "Apple product page" effect.
12. **GPU Particle Field** — configurable particle background (from `sparkles`/`bg-falling-stars` lineage, GL-backed). High. Why: rounds out the shader family.
13. **Image Trail Cursor** ✅ — pointer-driven image trail. Medium. Already present; feature it.
14. **Bento Showcase Section** — opinionated bento grid pre-composed for product features. Low-medium. Why: bridges atoms → sections, easy win.
15. **Animated Timeline / About** — scroll-revealed timeline (`timeline` + `tracing-beam` exist — compose into a signature block). Medium.

---

## 9. Priorities

### Short-term (quick wins, now)
- **Write the narrative.** A homepage hero + one "what is Fancy UI" page that states the wedge (§4). No code; positioning.
- **Promote existing signatures.** `noise-reveal`, `fluid-cursor`, `displacement-text`, `image-trail-cursor` are already differentiated — make them the front door, not buried in a 58-item list.
- **Ship 1–2 landing *sections*** (bento showcase, hero) to prove the atoms→sections jump.
- **Per-component `llms` fragments + prop schemas** — cheap, compounding agent-readability.

### Medium-term
- **`add` CLI / registry install flow** (the distribution unlock).
- **Shader family + shared GL helper** so new WebGL components are cheap.
- **Recipes/composition docs** ("landing page in 5 blocks").
- **AI Command Panel** productized from `/api/chat`.

### Bigger bets
- **The builder** as a real product surface — visual/agent-assisted page assembly from Fancy UI blocks.
- **A full section library** (the Aceternity-blocks equivalent, Svelte-native).
- **Registry-as-platform**: queryable, agent-first, the canonical way tools consume Fancy UI.

### What to postpone / not do
- Don't chase accessibility-heavy enterprise primitives (forms, grids) — defer to shadcn-svelte/Bits UI; position as complementary.
- Don't 2× the component count for its own sake — curation beats volume (Sigma's lesson).
- Don't port React effects 1:1 without a Svelte-native rethink.

---

## 10. Brand & narrative

- **Problem it solves:** great-looking, motion-rich web UI is expensive to build and usually React-only; Svelte developers copy effects by hand. Fancy UI gives them production-grade, shader-capable, *agent-buildable* components out of the box.
- **Why it exists:** to make Svelte the best place to build a site that feels alive — and the easiest for an AI agent to assemble.
- **Who's proud to use it:** the developer whose portfolio makes people ask "how did you build that?"; the founder whose launch page doesn't look like a template.

### Homepage tagline ideas
- "Beautiful, motion-first components for Svelte."
- "Make it move. Make it yours."
- "The creative toolkit for the AI-era web."
- "Shader-grade components. Agent-readable docs. Svelte 5."
- "Components that make your site feel alive."

### GitHub description ideas
- "Beautiful, motion-first Svelte 5 components — WebGL, shaders, and AI-readable docs."
- "A creative UI toolkit for Svelte 5: premium animations, shader effects, landing sections, agent-friendly."

### README intro options
1. > **Fancy UI** is a creative toolkit for Svelte 5 — premium, motion-first components with real WebGL and shader effects, built to make a site feel alive. Typed, tested, dark-mode aware, and documented so AI agents can build with them too.
2. > Most component libraries solve buttons and tables. **Fancy UI** solves the *memorable* layer: the hero that moves, the reveal that surprises, the cursor that reacts. Svelte 5, Tailwind 4, WebGL where it counts — and an `llms.txt` so your AI agent gets the imports right.
3. > **Fancy UI** is what you reach for when "it works" isn't enough and you want "how did you build that?". Shader-grade Svelte 5 components, copy-paste friendly, agent-readable by design.

---

## 11. What to build next (the actionable shortlist)

If the next contributor (human or agent) reads only this section:

1. **Narrative + signature front door** — a positioning page and a homepage that lead with `noise-reveal` / `fluid-cursor` / `displacement-text`, stating the Svelte + WebGL + AI-readable wedge. (docs/marketing only)
2. **First landing *sections*** — ship a **Bento Showcase** and a **Shader Hero** as composed, drop-in blocks. Proves the atoms→sections leap that unlocks the indie/landing-page audience.
3. **Agent-readability depth** — per-component `llms` fragments + machine-readable prop schemas + "common composition" hints, so an agent can assemble *sections*, not just import single components.

Then: the `add` CLI / registry-install flow (distribution), and a shared GL helper to make the shader family cheap to grow.

---

*Constraints honored by this document: no components implemented, no code refactored, no package behavior changed — documentation only.*

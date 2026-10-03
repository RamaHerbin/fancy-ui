# Inspiration catalog

The data behind `/inspiration`: one file per reference in `entries/`, collected by `catalog.ts`. Types and vocabularies live in `types.ts`; filters in `query.ts`. Only `status: "published"` entries reach the gallery, the sitemap and the homepage.

## Add a reference in five minutes

1. Copy a template below into `entries/<slug>.ts`. The slug is the URL segment; the id is the bookmark key and never changes once shipped. Neither may be `saved`.
2. Entry files may only `import type` (the media script loads them outside the app).
3. Fill `analysis` from what you saw: `why` (2–4 sentences on the visible behaviour), `whenToUse`, `watch` (touch, accessibility, motion cost), 2–4 `clues`.
4. Link library components by registry slug. `exact` means the reference _is_ that component (FancyUI entries only). `related` needs a one-line `note` on how it differs.
5. Capture the media (below), then run the checks.

### FancyUI entry (runs a live demo)

```ts
import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "my-slug",
	slug: "my-slug",
	origin: "fancyui",
	title: "Object — behaviour",
	summary: "One line under the title.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/<component>",
	addedAt: "2026-10-03",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["hover"],
	styleTags: ["glow"],
	useCaseTags: ["marketing"],
	codeAvailability: "open-source",
	analysis: { why: "…", whenToUse: "…", watch: "…", clues: ["…", "…"] },
	curatedRank: 42,
	collections: ["micro-interactions"],
	components: [{ slug: "<component>", relation: "exact" }],
	demo: {
		module: "my-slug", // → demos/my-slug.svelte, `let { values } = $props()`, root `h-full w-full`
		knobs: [{ key: "speed", type: "range", label: "Speed", min: 0, max: 1, step: 0.05 }],
		defaults: { speed: 0.5 }, // every knob key must be here
		// mount: "intent", // WebGL/canvas: only after an explicit Play
	},
	capture: { hover: [0.5, 0.5], delay: 1600 },
};

export default entry;
```

### External entry (an open-source project's demo)

```ts
import type { ExternalReference } from "../types.js";

const entry: ExternalReference = {
	id: "project-behaviour",
	slug: "project-behaviour",
	origin: "external",
	title: "Object — behaviour",
	summary: "…",
	kind: "interaction",
	creator: "<maintainer or org>",
	product: "<project name>",
	sourceUrl: "https://<demo page or repo>",
	addedAt: "2026-10-03",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["drag"],
	styleTags: ["minimal"],
	useCaseTags: ["data"],
	// sourceFramework / implementationFrameworks: only when the repo or its docs say so
	codeAvailability: "open-source",
	analysis: { why: "…", whenToUse: "…", watch: "…", clues: ["…"] },
	components: [{ slug: "<component>", relation: "related", note: "How ours differs." }],
	media: {
		type: "image",
		src: "/inspiration/external/project-behaviour.webp",
		width: 720,
		height: 450,
		alt: "What the frame shows, mid-interaction.",
		credit: "Captured from the project's demo (MIT)",
		provenance: {
			license: "MIT",
			licenseUrl: "https://github.com/<owner>/<repo>/blob/<branch>/LICENSE",
			capturedBy: "fancyui",
			capturedAt: "2026-10-03",
		},
	},
};

export default entry;
```

## Licence rule for external references

An external reference is published only with media **we captured ourselves** from an open-source project under a permissive licence (MIT, Apache-2.0, BSD, ISC, CC0, CC-BY), whose demo or source lives in that licensed repository. The frame shows only the project's own UI: no third-party logos or photos. Record the licence and its URL in `media.provenance` and add a row to `static/inspiration/CREDITS.md`. Never download or copy media from a third-party site. Proprietary products stay `draft`, without media.

Check the licence with `gh api repos/<owner>/<repo>/license --jq .license.spdx_id`.

## Capture media

FancyUI posters (720×450 WebP, ≤ 60 KB) are shot from the live demo on the dev-only route `/_capture/<slug>`, so the dev server must be running:

```sh
pnpm dev
node scripts/build-inspiration-media.mjs --base http://localhost:5173 [--only slug-a,slug-b]
```

The script rewrites `media.json` to list exactly the posters on disk. Steer a poster with `capture` in the entry (`delay`, `hover: [x, y]` as stage fractions, `sweep`, `skip`). For a poster that should show a press, click or typed value, mark the element in the demo module: `data-capture="click" | "press" | "type"`, plus `data-capture-text` and `data-capture-wait="ms"`. A resting control or an empty dark box is not a poster.

External media are captured by hand with Playwright at 1440×900 (2x, dark mode when the site offers it), cropped to a 16:10 region around the interaction mid-state, and encoded to 720×450 WebP ≤ 120 KB with `encodeWebp` from `scripts/lib/stage-capture.mjs`. Save to `static/inspiration/external/<slug>.webp`.

## Check

```sh
pnpm vitest run src/lib/inspiration
```

`catalog.test.ts` checks unique ids and slugs, required fields and ISO dates, component slugs against the registry, demo modules and knob defaults, media paths on disk, licensed media on published externals, `related` notes, no `exact` on externals, type-only imports in entry files, `media.json` against the posters, and the minimum counts for the gallery and the homepage.

## curatedRank

Lower comes first in the curated sort; `featured(6)` on the homepage takes the six lowest. Ranks 1–35 are FancyUI entries, 36–41 the external references. Keep ranks unique, give a new entry the next free number, and move it up only when it should displace something on the homepage. Unranked entries sort after ranked ones.

## Pending and drafts

Drafts (in `entries/`, `status: "draft"`, no media; the reason is the comment at the top of each file):

- Six proprietary references (a browser sidebar, a wallet app gesture, a command menu, a mobile OS pull-to-refresh, a desktop OS dock, a marketing-site gradient): no licence lets us capture them.

Open-source candidates checked on 2026-10-03 and not added:

- A toast library and a drawer library (both MIT): their demo sites are no longer in the licensed repositories, so a capture would not come from licensed source.
- A command-menu library (MIT): its homepage now redirects to the repository, and its themed demos reproduce third-party product styling and icons.
- A one-time-code input library (MIT): the demo site failed with a client-side error on load.
- A carousel library (MIT): the examples page returned 404 and the homepage shows no carousel to capture.

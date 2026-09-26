import * as pkg from "./index.js";
import * as cam from "./cameleon/index.js";

/**
 * What the two package-wide SSR sweeps agree on: which exports they visit and
 * which props (if any) each one needs to render at all.
 *
 * Shared rather than duplicated, for the same reason as the React package's
 * copy of this file: the export list and its fixtures are a frozen contract
 * both sweeps render against, and two copies is one update away from two
 * different contracts.
 *
 * Not part of the published package: excluded in `tsconfig.build.json`
 * alongside `test-setup.ts`, so no declaration for it reaches `dist`.
 */

export type Exported = readonly [key: string, value: unknown]; // key = "<barrel>:<Export>"

/**
 * Per-export prop fixtures for components that need more than the sweep's
 * default `default` slot with children "x". Empty until a migration wave adds
 * a component that needs one — most components need nothing beyond the slot.
 */
export const fixtures: Record<string, Record<string, unknown>> = {
	// `open` is required and renders nothing when falsy, so without it the sweep
	// would compare two empty strings and prove nothing about the panel.
	"root:Presence": { open: true },
	// The skin engine's provider requires a skin; the default one is the neutral fixture.
	"cameleon:FancyProvider": { skin: cam.defaultSkin },
	// The cameleon Tooltip requires its content.
	"cameleon:Tooltip": { content: "x" },
	// Keys are "<barrel>:<Export>" because the root barrel and the cameleon
	// barrel both export names such as `Select` (a headless listbox vs a
	// native-control primitive) with different prop shapes; a bare name could
	// only address one of them.
	// BEGIN generated fixtures (written by the registrar between waves from the port agents' reports; do not edit by hand)
	"root:AgentPlan": {"steps":[{"id":"s1","label":"Read the failing test","status":"done"},{"id":"s2","label":"Locate the retry helper","status":"running"}]},
	"root:AiDataTable": {"columns":[{"key":"option","label":"Option"},{"key":"latency","label":"p95 latency (ms)","numeric":true},{"key":"selfHosted","label":"Self-hosted"},{"key":"sla","label":"SLA"}],"rows":[{"option":"Managed cluster","latency":42,"selfHosted":false,"sla":"99.95%"},{"option":"Self-run nodes","latency":31,"selfHosted":true,"sla":null}]},
	"root:AnimatedLogoCloud": {"logos":[{"name":"Acme","path":"/acme.svg"}]},
	"root:AnimatedTestimonials": {"testimonials":[{"quote":"The attention to detail and innovative features have completely transformed our workflow.","name":"Sarah Chen","designation":"Product Manager","src":"/avatar-1.jpg"},{"quote":"A genuinely delightful upgrade for the whole team.","name":"Marcus Lee","designation":"Engineering Lead","src":"/avatar-2.jpg"}]},
	"root:AnimatedTooltip": {"items":[{"id":1,"name":"Alice","designation":"Engineer","image":"/alice.jpg"},{"id":"b","name":"Bob","designation":"Designer","image":"/bob.jpg"}]},
	"root:AppleCard": {"card":{"category":"Nature","title":"Mountains","src":"mountains.jpg","description":"High peaks."},"index":0,"expandedIndex":-1,"reducedMotion":false},
	"root:AppleCardCarousel": {"cards":[{"category":"Nature","title":"Mountains","src":"mountains.jpg","description":"High peaks."}]},
	"root:ApprovalCard": {"title":"Run database migration"},
	"root:BentoGridCard": {"name":"Feature","description":"Does a thing","href":"/feature","cta":"Learn more"},
	"root:Breadcrumb": {"items":[{"label":"Docs","href":"/docs"},{"label":"Core","href":"/docs/core"},{"label":"Motion","href":"/docs/core/motion"},{"label":"Button"}],"maxItems":3},
	"root:ColourfulText": {"text":"Fancy UI"},
	"root:Confetti": {"manualStart":true},
	"root:DirectionAwareHover": {"imageUrl":"/photo.jpg"},
	"root:FlipWords": {"words":["Better","Faster"]},
	"root:HyperText": {"text":"Hover me"},
	"root:IconLogoCloud": {"logos":[{"name":"Acme","path":"/acme.svg"}]},
	"root:LetterPullup": {"words":"Hello"},
	"root:LineReveal": {"text":"x"},
	"root:Link": {"href":"https://example.com","external":true},
	"root:NavbarLink": {"href":"/docs"},
	"root:NoiseReveal": {"src":"https://example.com/image.jpg"},
	"root:Pagination": {"count":12,"page":5,"showEdges":true},
	"root:PromptSuggestions": {"suggestions":["Summarize this","Explain the tradeoffs","Draft a reply"]},
	"root:ReviewCard": {"img":"x.png","name":"x","username":"@x","body":"x"},
	"root:Select": {"options":[{"value":"a","label":"A"},{"value":"b","label":"B"}],"value":"a"},
	"root:SidebarGroup": {"label":"General"},
	"root:SparklesText": {"text":"Sparkle!"},
	"root:StaticLogoCloud": {"logos":[{"name":"Acme","path":"/acme.svg"}]},
	"root:Step": {"label":"x"},
	"root:TerminalText": {"lines":["[INFO]  boot sequence complete","[OK]    all systems nominal"],"speed":25},
	"root:TextGenerateEffect": {"words":"hello world"},
	"root:TextRevealCard": {"starsCount":6,"starsClass":"sc","class":"cc","starsSeed":3},
	"root:TextRevealStars": {"starsCount":6,"class":"sc","seed":3},
	"root:Timeline": {"items":[{"id":"one","label":"2020"},{"id":"two","label":"2021"},{"id":"three","label":"2022"}],"title":"My Timeline","description":"A short subheading."},
	"root:ToggleGroupItem": {"value":"left"},
	"root:ToolCall": {"call":{"id":"call_1","name":"search_docs","status":"done","input":{"query":"retry policy","limit":3},"output":{"hits":3,"top":"billing/retries.md"},"durationMs":1400}},
	// END generated fixtures
	// NO `Dialog` entry, and the omission is deliberate rather than an oversight.
	// An open dialog puts its panel behind a teleport, and the hydration sweep
	// server-renders under jsdom — where `document` exists, so the teleport is
	// handed an element rather than the selector string a server render requires.
	// The renderer then drops the whole teleport payload and the client hydration
	// mismatches, turning that sweep red for a reason that has nothing to do with
	// this component. A closed dialog hydrates clean, which is what it gets here
	// until the portal resolves to a selector string on ANY server render rather
	// than only when `document` is missing. Measured both ways; see the dialog
	// folder's notes.
};

/**
 * True when a barrel export looks like a Vue component: a plain function
 * (functional component) or an object carrying `setup`, `render`, or
 * `template` (options-API / SFC-compiled component).
 */
function isVueComponent(value: unknown): boolean {
	if (typeof value === "function") return true;
	if (typeof value === "object" && value !== null) {
		return "setup" in value || "render" in value || "template" in value;
	}
	return false;
}

/** Every capitalised Vue-component export of the root barrel and `./cameleon`, keyed by barrel. */
export function exportedComponents(): Exported[] {
	const out: Exported[] = [];
	for (const [barrel, mod] of [
		["root", pkg],
		["cameleon", cam],
	] as const) {
		for (const [name, value] of Object.entries(mod)) {
			if (!/^[A-Z]/.test(name)) continue;
			if (!isVueComponent(value)) continue;
			out.push([`${barrel}:${name}`, value]);
		}
	}
	return out;
}

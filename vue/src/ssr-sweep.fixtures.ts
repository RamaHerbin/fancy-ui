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

/**
 * Exports that can only render INSIDE their provider: the sub-components of
 * a compound family (a menu item outside its menu, a popover panel outside its
 * popover). Rendered standalone they throw the internal-context error below —
 * exactly what the Svelte source does on the same misuse (its getContext read
 * is unguarded) — so the sweeps assert that error instead of a render. Keep the
 * list exact: an unlisted export that throws fails the sweep, and a listed one
 * that renders fine fails it too (the list has gone stale).
 */
export const PROVIDER_ONLY: ReadonlySet<string> = new Set([
	"root:DropdownMenuTrigger",
	"root:DropdownMenuContent",
	"root:DropdownMenuItem",
	"root:DropdownMenuSub",
	"root:DropdownMenuSubTrigger",
	"root:DropdownMenuSubContent",
	"root:NavigationMenuList",
	"root:NavigationMenuTrigger",
	"root:NavigationMenuContent",
	"root:PopoverContent",
]);
/** The message `createInternalContext(...).useRequired()` throws outside a provider. */
export const PROVIDER_ERROR = /is missing: this component must be rendered inside its provider/;

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
	"root:Autocomplete": {"suggestions":["Paris","Parma","Prague","London"]},
	"root:BentoGridCard": {"name":"Feature","description":"Does a thing","href":"/feature","cta":"Learn more"},
	"root:Breadcrumb": {"items":[{"label":"Docs","href":"/docs"},{"label":"Core","href":"/docs/core"},{"label":"Motion","href":"/docs/core/motion"},{"label":"Button"}],"maxItems":3},
	"root:CodeDiff": {"diff":"diff --git a/src/example.ts b/src/example.ts\n--- a/src/example.ts\n+++ b/src/example.ts\n@@ -1,2 +1,2 @@\n-old\n+new\n"},
	"root:ColourfulText": {"text":"Fancy UI"},
	"root:Combobox": {"options":[{"value":"svelte-5","label":"Svelte 5"},{"value":"sveltekit","label":"SvelteKit"},{"value":"react","label":"React"}],"label":"Framework"},
	"root:CommandMenu": {"items":[{"id":"btn","label":"Button","group":"Core","meta":"Actions"},{"id":"rainbow","label":"Rainbow Button","group":"Fancy","meta":"Buttons"},{"id":"settings","label":"Settings"}]},
	"root:Confetti": {"manualStart":true},
	"root:ContextRing": {"usage":{"used":12400,"max":200000}},
	"root:DirectionAwareHover": {"imageUrl":"/photo.jpg"},
	"root:Drawer": {"open":true,"title":"Filters","description":"Drag down to close."},
	"root:FlipWords": {"words":["Better","Faster"]},
	"root:HyperText": {"text":"Hover me"},
	"root:IconLogoCloud": {"logos":[{"name":"Acme","path":"/acme.svg"}]},
	"root:ImageGeneration": {"status":"done","src":"data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7","alt":"A red barn at dusk","prompt":"a red barn at dusk, 35mm"},
	"root:LetterPullup": {"words":"Hello"},
	"root:LineReveal": {"text":"x"},
	"root:Link": {"href":"https://example.com","external":true},
	"root:NavbarLink": {"href":"/docs"},
	"root:NavigationMenuItem": {"value":"products"},
	"root:NavigationMenuLink": {"href":"/components","title":"Components","description":"Browse the full UI library"},
	"root:NoiseReveal": {"src":"https://example.com/image.jpg"},
	"root:Pagination": {"count":12,"page":5,"showEdges":true},
	"root:PromptSuggestions": {"suggestions":["Summarize this","Explain the tradeoffs","Draft a reply"]},
	"root:RadioGroupItem": {"value":"a"},
	"root:RecommendationCard": {"title":"Add an index on orders.customer_id","confidence":0.87,"badge":"Suggestion"},
	"root:ReviewCard": {"img":"x.png","name":"x","username":"@x","body":"x"},
	"root:Select": {"options":[{"value":"a","label":"A"},{"value":"b","label":"B"}],"value":"a"},
	"root:SidebarGroup": {"label":"General"},
	"root:SourceCard": {"source":{"id":"s1","title":"Designing citation surfaces","url":"https://docs.example.dev/citations","domain":"docs.example.dev","snippet":"A citation is a promise that the answer can be checked."}},
	"root:Sources": {"sources":[{"id":"s1","title":"Designing citation surfaces","url":"https://docs.example.dev/citations","domain":"docs.example.dev","snippet":"A citation is a promise that the answer can be checked."}]},
	"root:SparklesText": {"text":"Sparkle!"},
	"root:StaticLogoCloud": {"logos":[{"name":"Acme","path":"/acme.svg"}]},
	"root:Step": {"label":"x"},
	"root:StickyScroll": {"items":[{"id":"a","label":"One"},{"id":"b","label":"Two"}]},
	"root:StreamingText": {"text":"Partial answer"},
	"root:SubagentList": {"agents":[{"id":"researcher","name":"Researcher","task":"Read the changelog for breaking changes","status":"running","progress":0.62,"model":"mini"},{"id":"writer","name":"Writer","task":"Draft the migration note","status":"done","model":"pro"}]},
	"root:TabsContent": {"value":"x","forceMount":true},
	"root:TabsTrigger": {"value":"x"},
	"root:TerminalBlock": {"output":"added 214 packages\naudited 215 packages\nfound 0 vulnerabilities","command":"pnpm build","exitCode":0,"durationMs":1240},
	"root:TerminalText": {"lines":["[INFO]  boot sequence complete","[OK]    all systems nominal"],"speed":25},
	"root:TextGenerateEffect": {"words":"hello world"},
	"root:TextRevealCard": {"starsCount":6,"starsClass":"sc","class":"cc","starsSeed":3},
	"root:TextRevealStars": {"starsCount":6,"class":"sc","seed":3},
	"root:TextRoll": {"value":"42"},
	"root:ThinkingIndicator": {"status":"Reading files"},
	"root:ThreadList": {"threads":[{"id":"t1","title":"Retry policy for billing webhooks","preview":"So a 429 should back off exponentially…","updatedAt":1767225360000,"unread":true},{"id":"t2","title":"Migration plan","updatedAt":1767214800000}],"activeId":"t1"},
	"root:Timeline": {"items":[{"id":"one","label":"2020"},{"id":"two","label":"2021"},{"id":"three","label":"2022"}],"title":"My Timeline","description":"A short subheading."},
	"root:Toast": {"item":{"id":"toast-1","title":"Theme saved","description":"CSS copied to the clipboard.","variant":"info","duration":5000}},
	"root:ToggleGroupItem": {"value":"left"},
	"root:ToolCall": {"call":{"id":"call_1","name":"search_docs","status":"done","input":{"query":"retry policy","limit":3},"output":{"hits":3,"top":"billing/retries.md"},"durationMs":1400}},
	"root:ToolTimeline": {"items":[{"id":"a","verb":"Read","target":"src/lib/utils.ts","detail":"312 lines"}]},
	"root:Tooltip": {"content":"Add to favorites"},
	"root:WebSearch": {"query":"svelte 5 runes reactivity","results":[{"id":"r1","title":"Example result","url":"https://example.dev/guide","snippet":"A short description of the result."}]},
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

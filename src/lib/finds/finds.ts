/**
 * The Finds catalog — every card on /finds, live and external, plus the
 * helpers the page filters with. Third-party product names are allowed in
 * this file only: an external find IS a reference to that product's own
 * interaction. Keep them out of PR titles, commits and changesets.
 */

import { GESTURES, GESTURE_LABELS, type Find, type Gesture, type LiveFind } from "./types.js";

const opt = (values: readonly string[]) => values.map((value) => ({ value, label: value }));

export const FINDS: Find[] = [
	// ── Hover ────────────────────────────────────────────────────────────
	{
		kind: "live",
		id: "magnetic-button",
		slug: "magnetic",
		demo: "magnetic-button",
		title: "Button — magnetic pull",
		gesture: "hover",
		why: "It leans toward the cursor before contact, so the click feels already accepted.",
		clues: [
			"pointer distance → translate",
			"radius gate",
			"spring return",
			"off under reduced motion",
		],
		tags: ["magnetic", "spring", "elastic", "button"],
		added: "2026-09-26",
		featured: true,
		knobs: [
			{ key: "strength", type: "range", label: "Strength", min: 0, max: 1, step: 0.05 },
			{ key: "radius", type: "range", label: "Radius", min: 0, max: 200, step: 10 },
			{ key: "max", type: "range", label: "Max travel", min: 0, max: 60, step: 2 },
		],
		defaults: { strength: 0.35, radius: 40, max: 24 },
	},
	{
		kind: "live",
		id: "hover-button-roll",
		slug: "interactive-hover-button",
		demo: "hover-button-roll",
		title: "Button — label roll",
		gesture: "hover",
		why: "Two labels swap on a vertical roll while a dot grows into the fill: one hover, three coordinated moves.",
		clues: ["overflow clip", "translateY 70%", "blur on exit", "one transition-delay ladder"],
		tags: ["roll", "morph", "button", "reveal"],
		added: "2026-09-26",
		knobs: [{ key: "text", type: "text", label: "Label" }],
		defaults: { text: "Hover me" },
	},
	{
		kind: "live",
		id: "card-spotlight",
		slug: "card-spotlight",
		demo: "card-spotlight",
		title: "Card — cursor spotlight",
		gesture: "hover",
		why: "The light source is the cursor, so the card reads as lit rather than highlighted.",
		clues: ["radial-gradient at pointer", "CSS vars from mousemove", "opacity ramp on enter"],
		tags: ["spotlight", "light", "card", "cursor"],
		added: "2026-09-26",
		knobs: [
			{ key: "gradientSize", type: "range", label: "Size", min: 80, max: 500, step: 10 },
			{ key: "gradientColor", type: "color", label: "Colour" },
			{ key: "gradientOpacity", type: "range", label: "Opacity", min: 0, max: 1, step: 0.05 },
		],
		defaults: { gradientSize: 200, gradientColor: "#262626", gradientOpacity: 0.8 },
	},
	{
		kind: "live",
		id: "flip-card",
		slug: "flip-card",
		demo: "flip-card",
		title: "Card — physical flip",
		gesture: "hover",
		why: "The back face catches a moving highlight mid-turn, which is what sells the thickness.",
		clues: [
			"preserve-3d",
			"backface-visibility",
			"glare layer keyed to the angle",
			"enter side sets direction",
		],
		tags: ["flip", "3d", "card", "light"],
		added: "2026-09-26",
		knobs: [
			{ key: "rotate", type: "select", label: "Axis", options: opt(["y", "x"]) },
			{ key: "trigger", type: "select", label: "Trigger", options: opt(["hover", "click"]) },
			{ key: "glare", type: "boolean", label: "Glare" },
			{ key: "duration", type: "range", label: "Duration", min: 300, max: 1500, step: 50 },
		],
		defaults: { rotate: "y", trigger: "hover", glare: true, duration: 700 },
	},
	{
		kind: "live",
		id: "dock-magnify",
		slug: "dock",
		demo: "dock-magnify",
		title: "Dock — distance magnify",
		gesture: "hover",
		why: "Each icon's scale is a function of its distance to the cursor, not a hover state.",
		clues: ["distance → scale curve", "width-driven layout, not transform", "spring settle"],
		tags: ["dock", "magnify", "distance", "spring"],
		added: "2026-09-26",
		knobs: [
			{ key: "magnification", type: "range", label: "Magnification", min: 30, max: 120, step: 5 },
			{ key: "distance", type: "range", label: "Reach", min: 60, max: 260, step: 10 },
		],
		defaults: { magnification: 60, distance: 140 },
	},
	{
		kind: "live",
		id: "fluid-cursor",
		slug: "fluid-cursor",
		demo: "fluid-cursor",
		title: "Canvas — fluid smoke trail",
		gesture: "hover",
		why: "Velocity, not position, drives the splat, so a fast flick reads differently from a slow drag.",
		clues: [
			"WebGL fluid sim",
			"splat force from pointer velocity",
			"dye dissipation",
			"pause when hidden",
		],
		tags: ["fluid", "webgl", "cursor", "simulation"],
		added: "2026-09-26",
		featured: true,
		mount: "intent",
		knobs: [
			{ key: "splatRadius", type: "range", label: "Splat radius", min: 0.05, max: 0.6, step: 0.05 },
			{ key: "curl", type: "range", label: "Curl", min: 0, max: 30, step: 1 },
			{ key: "colorIntensity", type: "range", label: "Intensity", min: 0.05, max: 0.6, step: 0.05 },
		],
		defaults: { splatRadius: 0.2, curl: 3, colorIntensity: 0.15 },
	},
	{
		kind: "live",
		id: "mosaic-glow",
		slug: "mosaic-glow",
		demo: "mosaic-glow",
		title: "Tiles — glow trail",
		gesture: "hover",
		why: "Trail and smoothing separate where the cursor is from where it was.",
		clues: ["canvas tiles", "per-tile intensity buffer", "trail decay", "idle drift"],
		tags: ["mosaic", "glow", "canvas", "cursor", "trail"],
		added: "2026-09-26",
		mount: "intent",
		knobs: [
			{ key: "color", type: "color", label: "Colour" },
			{ key: "tileSize", type: "range", label: "Tile", min: 6, max: 32, step: 2 },
			{ key: "radius", type: "range", label: "Radius", min: 60, max: 320, step: 10 },
		],
		defaults: { color: "#f2c318", tileSize: 18, radius: 170 },
	},
	{
		kind: "live",
		id: "liquid-text",
		slug: "liquid-text",
		demo: "liquid-text",
		title: "Text — liquid warp",
		gesture: "hover",
		why: "The glyphs displace and the chromatic split shows the displacement vector.",
		clues: ["fluid velocity field", "UV displacement", "chromatic ratio", "static below a width"],
		tags: ["liquid", "text", "webgl", "cursor", "refract"],
		added: "2026-09-26",
		mount: "intent",
		knobs: [
			{ key: "strength", type: "range", label: "Strength", min: 0, max: 1, step: 0.05 },
			{ key: "radius", type: "range", label: "Radius", min: 40, max: 400, step: 10 },
			{ key: "chromaticRatio", type: "range", label: "Chromatic", min: 0, max: 1, step: 0.05 },
		],
		defaults: { strength: 0.5, radius: 160, chromaticRatio: 0.2 },
	},

	// ── Press ────────────────────────────────────────────────────────────
	{
		kind: "live",
		id: "ripple-button",
		slug: "ripple-button",
		demo: "ripple-button",
		title: "Button — ripple at touch",
		gesture: "press",
		why: "The ripple starts where you pressed, so the button acknowledges the exact contact.",
		clues: ["clientX/Y → origin", "scale keyframe", "cleanup on animationend", "keyboard = centre"],
		tags: ["ripple", "button", "feedback"],
		added: "2026-09-26",
		knobs: [
			{ key: "rippleColor", type: "color", label: "Colour" },
			{ key: "duration", type: "range", label: "Duration", min: 200, max: 1500, step: 50 },
		],
		defaults: { rippleColor: "#60a5fa", duration: 900 },
	},
	{
		kind: "live",
		id: "pressable-scale",
		slug: "pressable",
		demo: "pressable-scale",
		title: "Wrapper — press squash",
		gesture: "press",
		why: "Scale drops on pointerdown, not click, so feedback lands before the action.",
		clues: ["pointerdown / pointerup pairing", "pointercancel", "navigator.vibrate pattern"],
		tags: ["press", "scale", "haptic", "elastic"],
		added: "2026-09-26",
		knobs: [
			{ key: "scale", type: "range", label: "Scale", min: 0.8, max: 1, step: 0.01 },
			{
				key: "haptic",
				type: "select",
				label: "Haptic",
				options: opt(["none", "light", "medium", "heavy", "success", "error"]),
			},
		],
		defaults: { scale: 0.97, haptic: "light" },
	},
	{
		kind: "live",
		id: "status-morph",
		slug: "status-morph",
		demo: "status-morph",
		title: "Button — status morph",
		gesture: "press",
		why: "One SVG path carries loading → success → error, so the eye never re-finds the icon.",
		clues: ["single path morph", "stroke-dasharray", "reset timer", "tone current / semantic"],
		tags: ["morph", "status", "loading", "success", "button"],
		added: "2026-09-26",
		knobs: [
			{ key: "resetAfter", type: "range", label: "Reset after", min: 500, max: 4000, step: 100 },
			{ key: "tone", type: "select", label: "Tone", options: opt(["current", "semantic"]) },
		],
		defaults: { resetAfter: 1800, tone: "current" },
	},
	{
		kind: "live",
		id: "presence-toggle",
		slug: "presence",
		demo: "presence-toggle",
		title: "Panel — enter and exit",
		gesture: "press",
		why: "Exit is shorter than enter; the panel leaves like it means it.",
		clues: ["enter / exit durations", "preset transforms", "inert during exit"],
		tags: ["presence", "enter", "exit", "reveal", "transition"],
		added: "2026-09-26",
		knobs: [
			{
				key: "preset",
				type: "select",
				label: "Preset",
				options: opt([
					"fade",
					"fade-up",
					"fade-down",
					"fade-left",
					"fade-right",
					"scale",
					"blur",
					"zoom",
				]),
			},
			{ key: "duration", type: "range", label: "Enter", min: 100, max: 800, step: 25 },
			{ key: "exitDuration", type: "range", label: "Exit", min: 50, max: 600, step: 25 },
		],
		defaults: { preset: "fade-up", duration: 300, exitDuration: 200 },
	},
	{
		kind: "live",
		id: "datamosh-page",
		slug: "datamosh-transition",
		demo: "datamosh-page",
		title: "Page — datamosh swap",
		gesture: "press",
		why: "The cover hides the swap; the reveal shows the new page as if decoded from noise.",
		clues: ["cover / reveal promise API", "canvas bands", "contained mode"],
		tags: ["datamosh", "glitch", "transition", "canvas", "page"],
		added: "2026-09-26",
		mount: "intent",
		knobs: [
			{
				key: "variant",
				type: "select",
				label: "Variant",
				options: opt(["curtain", "rise", "split", "interlace"]),
			},
			{ key: "speed", type: "range", label: "Speed", min: 0.5, max: 2, step: 0.1 },
		],
		defaults: { variant: "curtain", speed: 1 },
	},

	// ── Drag ─────────────────────────────────────────────────────────────
	{
		kind: "live",
		id: "compare-drag",
		slug: "compare",
		demo: "compare-drag",
		title: "Compare — drag the seam",
		gesture: "drag",
		why: "The seam is the only thing that moves, so before and after stay anchored.",
		clues: ["clip-path inset", "pointer capture", "hover vs drag mode", "beam trail from velocity"],
		tags: ["compare", "slide", "seam", "drag", "image"],
		added: "2026-09-26",
		knobs: [
			{ key: "slideMode", type: "select", label: "Mode", options: opt(["drag", "hover"]) },
			{ key: "initialSliderPercentage", type: "range", label: "Start", min: 0, max: 100, step: 5 },
		],
		defaults: { slideMode: "drag", initialSliderPercentage: 50 },
	},
	{
		kind: "live",
		id: "slider-drag",
		slug: "slider",
		demo: "slider-drag",
		title: "Slider — live readout",
		gesture: "drag",
		why: "The fill and the number move as one; there is no lag to reconcile.",
		clues: ["native range", "CSS var fill", "tabular value", "sound tick"],
		tags: ["slider", "drag", "range", "readout"],
		added: "2026-09-26",
		knobs: [
			{ key: "step", type: "select", label: "Step", options: opt(["1", "5", "10"]) },
			{ key: "showValue", type: "boolean", label: "Show value" },
			{ key: "sound", type: "boolean", label: "Sound" },
		],
		defaults: { step: "5", showValue: true, sound: false },
	},

	// ── Type ─────────────────────────────────────────────────────────────
	{
		kind: "live",
		id: "password-strength",
		slug: "password-input",
		demo: "password-strength",
		title: "Password — strength meter",
		gesture: "type",
		why: "The meter answers per keystroke, so the rule is learned by typing, not by reading.",
		clues: ["strength() per input", "segmented meter", "aria-live"],
		tags: ["password", "strength", "meter", "form", "type"],
		added: "2026-09-26",
		knobs: [
			{ key: "showStrength", type: "boolean", label: "Strength meter" },
			{ key: "showToggle", type: "boolean", label: "Reveal toggle" },
		],
		defaults: { showStrength: true, showToggle: true },
	},
	{
		kind: "live",
		id: "text-roll",
		slug: "text-roll",
		demo: "text-roll",
		title: "Price — digit roll",
		gesture: "type",
		why: "Stable graphemes keep their node; the diff is what animates.",
		clues: ["keyed per grapheme", "inline-grid clip", "direction auto", "tabular-nums"],
		tags: ["roll", "digits", "counter", "morph", "text"],
		added: "2026-09-26",
		knobs: [
			{ key: "duration", type: "range", label: "Duration", min: 100, max: 1200, step: 50 },
			{ key: "stagger", type: "range", label: "Stagger", min: 0, max: 60, step: 5 },
			{
				key: "direction",
				type: "select",
				label: "Direction",
				options: opt(["auto", "up", "down"]),
			},
		],
		defaults: { duration: 300, stagger: 15, direction: "auto" },
	},

	// ── Select ───────────────────────────────────────────────────────────
	{
		kind: "live",
		id: "switch-thumb",
		slug: "switch",
		demo: "switch-thumb",
		title: "Switch — thumb travel",
		gesture: "select",
		why: "Travel and tint are one transition, so the state change reads as a single event.",
		clues: ["translateX on :checked", "colour transition", "size tokens", "role=switch"],
		tags: ["switch", "toggle", "select", "form"],
		added: "2026-09-26",
		knobs: [
			{ key: "size", type: "select", label: "Size", options: opt(["sm", "md", "lg"]) },
			{ key: "sound", type: "boolean", label: "Sound" },
		],
		defaults: { size: "md", sound: false },
	},
	{
		kind: "live",
		id: "tabs-indicator",
		slug: "tabs",
		demo: "tabs-indicator",
		title: "Tabs — sliding indicator",
		gesture: "select",
		why: "The underline moves instead of blinking, so the eye follows the choice.",
		clues: ["measured trigger rect", "transform on a shared indicator", "roving tabindex"],
		tags: ["tabs", "indicator", "slide", "select", "navigation"],
		added: "2026-09-26",
		knobs: [
			{
				key: "variant",
				type: "select",
				label: "Variant",
				options: opt(["underline", "segmented"]),
			},
			{
				key: "activation",
				type: "select",
				label: "Activation",
				options: opt(["automatic", "manual"]),
			},
		],
		defaults: { variant: "underline", activation: "automatic" },
	},

	// ── Scroll ───────────────────────────────────────────────────────────
	{
		kind: "live",
		id: "reveal-stagger",
		slug: "reveal",
		demo: "reveal-stagger",
		title: "Cards — staggered reveal",
		gesture: "scroll",
		why: "Stagger gives reading order; the last card lands as your eye reaches it.",
		clues: ["IntersectionObserver", "stagger ladder", "from first / centre / last"],
		tags: ["reveal", "stagger", "scroll", "entrance"],
		added: "2026-09-26",
		knobs: [
			{
				key: "preset",
				type: "select",
				label: "Preset",
				options: opt(["fade", "fade-up", "fade-down", "fade-left", "fade-right", "scale"]),
			},
			{ key: "stagger", type: "range", label: "Stagger", min: 0, max: 200, step: 10 },
			{ key: "distance", type: "range", label: "Distance", min: 0, max: 60, step: 4 },
		],
		defaults: { preset: "fade-up", stagger: 60, distance: 16 },
	},
	{
		kind: "live",
		id: "scroll-progress-inline",
		slug: "scroll-progress",
		demo: "scroll-progress-inline",
		title: "Reading bar — box progress",
		gesture: "scroll",
		why: "The bar tracks an element, not the page, so it means how far into this.",
		clues: ["target element", "scaleX from scrollTop / scrollHeight", "position inline"],
		tags: ["progress", "scroll", "reading", "bar"],
		added: "2026-09-26",
	},

	// ── Ambient ──────────────────────────────────────────────────────────
	{
		kind: "live",
		id: "neon-border",
		slug: "neon-border",
		demo: "neon-border",
		title: "Frame — neon beams",
		gesture: "ambient",
		why: "Two hues chase each other around the frame; the eye reads motion without anything inside moving.",
		clues: ["conic-gradient rotation", "mask to border", "half / full animation"],
		tags: ["neon", "border", "beam", "glow", "ambient"],
		added: "2026-09-26",
		knobs: [
			{ key: "color1", type: "color", label: "Colour 1" },
			{ key: "color2", type: "color", label: "Colour 2" },
			{
				key: "animationType",
				type: "select",
				label: "Beams",
				options: opt(["half", "full", "none"]),
			},
		],
		defaults: { color1: "#0496ff", color2: "#ff0a54", animationType: "half" },
	},
	{
		kind: "live",
		id: "meteors",
		slug: "meteors",
		demo: "meteors",
		title: "Backdrop — meteor shower",
		gesture: "ambient",
		why: "Same seed, same shower: randomness is decided once, so it is reproducible and cheap.",
		clues: ["seeded PRNG", "per-meteor delay / scale", "angle", "depth → speed"],
		tags: ["meteors", "background", "particles", "ambient", "parallax"],
		added: "2026-09-26",
		knobs: [
			{ key: "count", type: "range", label: "Count", min: 5, max: 40, step: 1 },
			{ key: "angle", type: "range", label: "Angle", min: 180, max: 270, step: 5 },
			{ key: "speed", type: "range", label: "Speed", min: 0.5, max: 2, step: 0.1 },
		],
		defaults: { count: 20, angle: 215, speed: 1 },
	},
	{
		kind: "live",
		id: "pulse-beam",
		slug: "pulse-beam",
		demo: "pulse-beam",
		title: "Composer — pulse beam",
		gesture: "ambient",
		why: "The beam breathes on the outside of the child, so the child stays opaque and unchanged.",
		clues: ["mask padding", "hue-rotate", "IntersectionObserver pause", "inner / outside variant"],
		tags: ["beam", "pulse", "glow", "ambient", "ai"],
		added: "2026-09-26",
		knobs: [
			{
				key: "palette",
				type: "select",
				label: "Palette",
				options: opt(["colorful", "mono", "ocean", "sunset"]),
			},
			{ key: "variant", type: "select", label: "Variant", options: opt(["inner", "outside"]) },
			{ key: "speed", type: "range", label: "Speed", min: 0.5, max: 2, step: 0.1 },
		],
		defaults: { palette: "colorful", variant: "inner", speed: 1 },
	},

	// ── External references ──────────────────────────────────────────────
	{
		kind: "external",
		id: "ios-pull-to-refresh",
		title: "iOS list — pull to refresh",
		gesture: "drag",
		why: "The spinner assembles from the pull distance, so the gesture is its own progress bar.",
		clues: ["overscroll → rubber band", "threshold commit", "spinner drawn from pull ratio"],
		tags: ["pull", "refresh", "elastic", "mobile", "list"],
		added: "2026-09-26",
		source: {
			name: "Apple — Human Interface Guidelines",
			url: "https://developer.apple.com/design/human-interface-guidelines/",
		},
	},
	{
		kind: "external",
		id: "macos-dock-magnification",
		title: "macOS Dock — magnification",
		gesture: "hover",
		why: "Neighbours grow with proximity, not on hover, so the target is never occluded.",
		clues: ["distance-to-cursor scale", "width-driven layout", "settle on leave"],
		tags: ["dock", "magnify", "distance", "desktop"],
		added: "2026-09-26",
		source: { name: "Apple — macOS", url: "https://www.apple.com/macos/" },
	},
	{
		kind: "external",
		id: "linear-command-menu",
		title: "Linear — command menu",
		gesture: "type",
		why: "Every action is typeable; the menu is the app's keyboard.",
		clues: ["fuzzy match", "roving focus", "nested pages via a back stack"],
		tags: ["command", "palette", "keyboard", "search", "type"],
		added: "2026-09-26",
		source: { name: "Linear", url: "https://linear.app" },
	},
	{
		kind: "external",
		id: "stripe-mesh-gradient",
		title: "Stripe — mesh gradient",
		gesture: "ambient",
		why: "The hero background is a WebGL mesh that never repeats, so the page feels alive without moving anything the eye tracks.",
		clues: ["WebGL plane", "noise-driven control points", "four-colour blend"],
		tags: ["gradient", "mesh", "webgl", "ambient", "background"],
		added: "2026-09-26",
		source: { name: "Stripe", url: "https://stripe.com" },
	},
	{
		kind: "external",
		id: "arc-sidebar-peek",
		title: "Arc — sidebar peek",
		gesture: "hover",
		why: "Edge proximity, not a click, opens the sidebar, and it retreats the moment the cursor leaves.",
		clues: ["edge hit zone", "translateX with delay", "pointerleave close"],
		tags: ["sidebar", "peek", "edge", "reveal", "browser"],
		added: "2026-09-26",
		source: { name: "Arc", url: "https://arc.net" },
	},
	{
		kind: "external",
		id: "family-wallet-drag",
		title: "Family — drag to reorder",
		gesture: "drag",
		why: "Cards displace physically as you drag one past them; the list reads as objects, not rows.",
		clues: ["pointer-driven transform", "sibling displacement", "spring drop"],
		tags: ["drag", "reorder", "spring", "wallet", "mobile"],
		added: "2026-09-26",
		source: { name: "Family", url: "https://family.co" },
	},
];

// ── Helpers ────────────────────────────────────────────────────────────

/** Featured first, then newest first; ties keep catalog order. */
export function getFinds(finds: Find[] = FINDS): Find[] {
	return [...finds].sort((a, b) => {
		const featured = Number(b.featured ?? false) - Number(a.featured ?? false);
		if (featured !== 0) return featured;
		return b.added.localeCompare(a.added);
	});
}

export function getFind(id: string, finds: Find[] = FINDS): Find | undefined {
	return finds.find((find) => find.id === id);
}

export function isLive(find: Find): find is LiveFind {
	return find.kind === "live";
}

export interface GestureCount {
	gesture: Gesture;
	label: string;
	count: number;
}

/** Gestures in canonical order, only those with at least one find. */
export function gesturesWithCounts(finds: Find[] = FINDS): GestureCount[] {
	return GESTURES.map((gesture) => ({
		gesture,
		label: GESTURE_LABELS[gesture],
		count: finds.filter((find) => find.gesture === gesture).length,
	})).filter((entry) => entry.count > 0);
}

function haystack(find: Find): string {
	const parts = [find.title, find.why, ...find.clues, ...find.tags, find.gesture];
	if (find.kind === "live") parts.push(find.slug);
	else parts.push(find.source.name);
	return parts.join(" ").toLowerCase();
}

/** Case-insensitive substring match over title, why, clues, tags, slug and source. */
export function searchFinds(query: string, finds: Find[] = FINDS): Find[] {
	const q = query.trim().toLowerCase();
	if (!q) return finds;
	return finds.filter((find) => haystack(find).includes(q));
}

export interface FindsFilter {
	gesture?: Gesture | "all";
	query?: string;
	/** Restrict to these ids (the Saved view). `undefined` = no restriction. */
	ids?: ReadonlySet<string>;
}

/** The one function the page's `$derived.by` calls: gesture, then search, then saved. */
export function filterFinds(filter: FindsFilter = {}, finds: Find[] = FINDS): Find[] {
	let items = getFinds(finds);
	if (filter.gesture && filter.gesture !== "all") {
		items = items.filter((find) => find.gesture === filter.gesture);
	}
	if (filter.query) items = searchFinds(filter.query, items);
	if (filter.ids) items = items.filter((find) => filter.ids!.has(find.id));
	return items;
}

<script lang="ts" module>
	export type GlowBorderPreset = "chromatic" | "silver" | "gold";

	export interface GlowBorderProps {
		/** Additional classes on the overlay */
		class?: string;
		/** Border radius in pixels (the overlay also inherits its parent's radius) */
		borderRadius?: number;
		/**
		 * Custom metal tints: one colour or several. Overrides `preset`; neutral
		 * silver and shadow tones are woven in so it still reads as metal.
		 */
		color?: string | string[];
		/** Width of the metal ring in pixels */
		borderWidth?: number;
		/** Length of one flow cycle of the metal, in seconds. The glint laps in 0.4× that. */
		duration?: number;
		/** Metal palette: iridescent chrome, cool steel or warm gold */
		preset?: GlowBorderPreset;
		/** Intensity of the glint and its glow, 0–1 */
		strength?: number;
	}

	interface Palette {
		/** Bright tints, the colours the reflections flash. */
		tints: string[];
		/** The metal's body between reflections. */
		body: string;
		/** The shadow a reflection falls off into. */
		shadow: string;
	}

	/** Palettes per preset, one per theme: light pages need deeper tones to read. */
	export const GLOW_BORDER_PRESETS: Record<GlowBorderPreset, { dark: Palette; light: Palette }> = {
		chromatic: {
			dark: {
				tints: ["#ffffff", "#f5b8d0", "#8fe3d9", "#b9a8ff", "#f3d58a"],
				body: "#8a9099",
				shadow: "#2a2d33",
			},
			light: {
				tints: ["#5b636d", "#d9669a", "#2fa89a", "#7a62e6", "#c99a2e"],
				body: "#9aa3ad",
				shadow: "#e3e6ea",
			},
		},
		silver: {
			dark: {
				tints: ["#ffffff", "#dfe4ea", "#b8c2cf", "#f2f5f8"],
				body: "#7d848f",
				shadow: "#2b2f35",
			},
			light: {
				tints: ["#4b525c", "#7d8793", "#5f6975", "#2f353d"],
				body: "#aab2bc",
				shadow: "#e6e9ed",
			},
		},
		gold: {
			dark: {
				tints: ["#fff4cf", "#f7d98b", "#ffe7a3", "#e9b95c"],
				body: "#c8973f",
				shadow: "#4a3616",
			},
			light: {
				tints: ["#8a6424", "#b8862f", "#6e4d17", "#c99a2e"],
				body: "#d9b56a",
				shadow: "#f3e8cf",
			},
		},
	};

	/** A custom `color` turned into a metal palette: the tints, over neutral body and shadow. */
	export function customPalette(color: string | string[], theme: "dark" | "light"): Palette {
		const list = (Array.isArray(color) ? color : [color]).filter(Boolean);
		const tints = list.length ? list : ["#ffffff"];
		return theme === "dark"
			? { tints: ["#ffffff", ...tints], body: "#7d848f", shadow: "#2a2d33" }
			: { tints, body: "#9aa3ad", shadow: "#e3e6ea" };
	}

	/**
	 * One metal field as a conic gradient: reflections (tints) alternating
	 * with body and shadow, spread around the turn so no two flashes touch.
	 * Two of these, centred apart and turning against each other, are what
	 * make the surface look liquid rather than spun.
	 */
	export function metalField(p: Palette, angleVar: string, at: string, offset = 0): string {
		const stops: string[] = [];
		const n = p.tints.length;
		const step = 100 / n;
		for (let i = 0; i < n; i++) {
			const base = i * step;
			const tint = p.tints[(i + offset) % n];
			// Mostly shadow, a little body, one sharp reflection: sparse flashes
			// on a dark ring read as polished metal, an even tone as plastic.
			stops.push(`${p.shadow} ${base.toFixed(1)}%`);
			stops.push(`${p.shadow} ${(base + step * 0.22).toFixed(1)}%`);
			stops.push(`${p.body} ${(base + step * 0.4).toFixed(1)}%`);
			stops.push(`${tint} ${(base + step * 0.5).toFixed(1)}%`);
			stops.push(`${p.body} ${(base + step * 0.6).toFixed(1)}%`);
			stops.push(`${p.shadow} ${(base + step * 0.8).toFixed(1)}%`);
		}
		stops.push(`${p.shadow} 100%`);
		return `conic-gradient(from var(${angleVar}) at ${at}, ${stops.join(", ")})`;
	}

	/** Both metal fields, stacked for `background` (blended in CSS). */
	export function metalBackground(p: Palette): string {
		return `${metalField(p, "--gb-a1", "30% 40%")}, ${metalField(p, "--gb-a2", "72% 65%", 2)}`;
	}

	/** The glint's colour trail: a short arc that brightens to white. */
	export function glintArc(p: Palette): string {
		const lead = p.tints[1] ?? p.tints[0];
		// a one-colour custom palette is [white, colour]: trail in the colour, not white
		const tail = p.tints[2] ?? p.tints[p.tints.length - 1];
		return `conic-gradient(from var(--gb-a3), transparent 0%, transparent 72%, ${tail} 84%, #ffffff 90%, ${lead} 94%, transparent 99%)`;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils";

	let {
		class: className = "",
		borderRadius = 10,
		color,
		borderWidth = 1.5,
		duration = 10,
		preset = "chromatic",
		strength = 0.8,
	}: GlowBorderProps = $props();

	const palettes = $derived(
		color !== undefined
			? { dark: customPalette(color, "dark"), light: customPalette(color, "light") }
			: (GLOW_BORDER_PRESETS[preset] ?? GLOW_BORDER_PRESETS.chromatic)
	);

	const strengthC = $derived(Math.min(1, Math.max(0, Number.isFinite(strength) ? strength : 0.8)));

	let styles = $derived(
		[
			`--glow-border-radius: ${borderRadius}px`,
			`--glow-border-width: ${borderWidth}px`,
			`--glow-duration: ${duration}s`,
			`--glow-strength: ${strengthC}`,
			`--gb-metal-dark: ${metalBackground(palettes.dark)}`,
			`--gb-metal-light: ${metalBackground(palettes.light)}`,
			`--gb-glint-dark: ${glintArc(palettes.dark)}`,
			`--gb-glint-light: ${glintArc(palettes.light)}`,
			`border-radius: var(--glow-border-radius)`,
		].join("; ")
	);
</script>

<div
	class={cn(
		"glow-border animate-glow pointer-events-none absolute inset-0 size-full rounded-[inherit]",
		className
	)}
	style={styles}
	aria-hidden="true"
>
	<span class="glow-border__halo"><span></span></span>
	<span class="glow-border__metal"></span>
	<span class="glow-border__glint"></span>
</div>

<style>
	@property --gb-a1 {
		syntax: "<angle>";
		inherits: true;
		initial-value: 0deg;
	}

	@property --gb-a2 {
		syntax: "<angle>";
		inherits: true;
		initial-value: 120deg;
	}

	@property --gb-a3 {
		syntax: "<angle>";
		inherits: true;
		initial-value: 0deg;
	}

	/* Light pages get the deeper palette; `.dark` switches to the bright one. */
	.glow-border {
		--gb-metal: var(--gb-metal-light);
		--gb-glint: var(--gb-glint-light);
		/* on a light page a coloured halo reads as fog: keep it faint */
		--gb-halo-opacity: 0.35;
	}

	:global(.dark) .glow-border {
		--gb-metal: var(--gb-metal-dark);
		--gb-glint: var(--gb-glint-dark);
		--gb-halo-opacity: 0.7;
	}

	.glow-border > span,
	.glow-border__halo > span {
		position: absolute;
		border-radius: inherit;
		pointer-events: none;
	}

	/* keep only the padding ring: the element minus its content box */
	.glow-border__metal,
	.glow-border__glint,
	.glow-border__halo > span {
		-webkit-mask:
			linear-gradient(#000 0 0) content-box,
			linear-gradient(#000 0 0);
		-webkit-mask-composite: xor;
		mask:
			linear-gradient(#000 0 0) content-box,
			linear-gradient(#000 0 0);
		mask-composite: exclude;
	}

	/* Liquid metal: two fields, centred apart and turning against each other. */
	.glow-border__metal {
		inset: 0;
		padding: var(--glow-border-width);
		background: var(--gb-metal);
		background-blend-mode: soft-light;
	}

	/* The glint riding the ring. */
	.glow-border__glint {
		inset: 0;
		padding: var(--glow-border-width);
		background: var(--gb-glint);
		mix-blend-mode: screen;
		opacity: var(--glow-strength);
	}

	/* The light it spills on both sides of the edge, blurred after masking. */
	.glow-border__halo {
		inset: 0;
		filter: blur(6px);
		opacity: calc(var(--glow-strength) * var(--gb-halo-opacity));
	}

	.glow-border__halo > span {
		inset: -5px;
		padding: calc(var(--glow-border-width) + 9px);
		border-radius: calc(var(--glow-border-radius) + 5px);
		background: var(--gb-glint);
	}

	.animate-glow {
		animation:
			gb-flow-1 var(--glow-duration) linear infinite,
			gb-flow-2 calc(var(--glow-duration) * 1.7) linear infinite reverse,
			gb-glint calc(var(--glow-duration) * 0.4) linear infinite;
	}

	@keyframes gb-flow-1 {
		to {
			--gb-a1: 360deg;
		}
	}

	@keyframes gb-flow-2 {
		from {
			--gb-a2: 120deg;
		}
		to {
			--gb-a2: 480deg;
		}
	}

	@keyframes gb-glint {
		to {
			--gb-a3: 360deg;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.animate-glow {
			animation: none;
			--gb-a3: 210deg;
		}
	}
</style>

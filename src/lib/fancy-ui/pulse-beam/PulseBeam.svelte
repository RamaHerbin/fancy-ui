<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";
	import type { PulseBeamPalette, PulseBeamTone, PulseBeamVariant } from "./pulse-beam-data.js";

	export type { PulseBeamPalette, PulseBeamTone, PulseBeamVariant };

	/**
	 * PulseBeam — a breathing, colour-shifting border glow.
	 *
	 * Wrap any card or control. Three masked gradient layers (a 1px ring, a
	 * feathered inner glow and a blurred bloom) are driven by a shared
	 * animation loop through CSS custom properties, so the effect stays on the
	 * compositor and costs one style recalc per frame per instance.
	 */
	interface BaseProps {
		/** Additional classes on the wrapper */
		class?: string;
		/** Content the glow wraps — give it an opaque background and the same radius */
		children?: Snippet;
		/** Bindable wrapper element */
		ref?: HTMLDivElement | null;
		/** Show the glow. Off fades out (500ms) and stops the loop; on fades in (600ms). */
		active?: boolean;
		/** `inner` paints inside the box; `outside` adds a blurred halo behind the content */
		variant?: PulseBeamVariant;
		/** Built-in nine-slot colour set. `mono` halves opacity and disables hue drift. */
		palette?: PulseBeamPalette;
		/** Up to nine CSS colours overriding the palette slots in order */
		colors?: string[];
		/** Overall intensity, 0–1 */
		strength?: number;
		/** Corner radius in px, applied to the wrapper and every layer */
		radius?: number;
		/** Multiplier for the breathing and drift periods */
		speed?: number;
		/** Opacity / brightness / saturation preset for the surface the card sits on */
		tone?: PulseBeamTone;
		/** Slowly rotate every hue over a 14–16s cycle */
		hueShift?: boolean;
		/** Override the preset brightness filter */
		brightness?: number;
		/** Override the preset saturation filter */
		saturation?: number;
		/** Called once the fade-in has completed */
		onfadein?: () => void;
		/** Called once the fade-out has completed and the loop has stopped */
		onfadeout?: () => void;
	}

	export type PulseBeamProps = BaseProps & Omit<HTMLAttributes<HTMLDivElement>, keyof BaseProps>;
</script>

<script lang="ts">
	import { onMount, untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import {
		LAYER_PRESETS,
		buildLayerBackgrounds,
		buildOscillators,
		motionPreset,
	} from "./pulse-beam-data.js";
	import { registerPulse } from "./pulse-beam-loop.js";

	let {
		class: className,
		children,
		ref = $bindable(null),
		active = true,
		variant = "inner",
		palette = "colorful",
		colors,
		strength = 1,
		radius = 16,
		speed = 1,
		tone = "dark",
		hueShift = true,
		brightness,
		saturation,
		onfadein,
		onfadeout,
		...restProps
	}: PulseBeamProps = $props();

	const FADE_IN_MS = 600;
	const FADE_OUT_MS = 500;
	/** Slack after the CSS duration before the JS fallback settles the fade. */
	const FADE_SLACK_MS = 80;

	type Phase = "idle" | "active" | "fading";

	// Starts idle even when `active` is true so the first activation is a real
	// fade-in, and SSR output never flashes a fully lit ring before hydration.
	let phase = $state<Phase>("idle");
	let reducedMotion = $state(false);

	// Plain lets: touched by timers and events, never rendered.
	let pending: "in" | "out" | null = null;
	let fadeTimer: ReturnType<typeof setTimeout> | undefined;

	// --- derived configuration -------------------------------------------------

	const preset = $derived(LAYER_PRESETS[variant][tone]);
	const isMono = $derived(palette === "mono" && !colors?.length);
	const monoFactor = $derived(isMono ? 0.5 : 1);
	const motion = $derived(motionPreset(variant, tone, speed));
	const oscillators = $derived(buildOscillators(motion));
	const hueEnabled = $derived(hueShift && !isMono);
	const backgrounds = $derived(
		buildLayerBackgrounds({ variant, palette, colors, tone, op: motion.op })
	);
	const clampedStrength = $derived(
		Math.min(1, Math.max(0, Number.isFinite(strength) ? strength : 1))
	);
	const running = $derived(phase !== "idle");

	// --- reduced motion ----------------------------------------------------------

	onMount(() => {
		if (typeof window.matchMedia !== "function") return;
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		reducedMotion = mq.matches;
		const handler = (e: MediaQueryListEvent) => {
			reducedMotion = e.matches;
		};
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	});

	// --- fade state machine ------------------------------------------------------

	function settle(kind: "in" | "out") {
		if (pending !== kind) return;
		pending = null;
		clearTimeout(fadeTimer);
		if (kind === "out") {
			phase = "idle";
			onfadeout?.();
		} else {
			onfadein?.();
		}
	}

	function handleTransitionEnd(e: TransitionEvent) {
		if (e.propertyName !== "opacity" || e.target !== e.currentTarget) return;
		settle(phase === "fading" ? "out" : "in");
	}

	$effect(() => {
		const on = active;
		const host = ref;
		untrack(() => {
			clearTimeout(fadeTimer);
			if (on) {
				if (phase === "active") return;
				// Force the idle style to be computed so the flip to active is a
				// transition rather than a first paint.
				if (phase === "idle" && host) void host.offsetWidth;
				phase = "active";
				pending = "in";
			} else {
				if (phase === "idle") {
					pending = null;
					return;
				}
				phase = "fading";
				pending = "out";
			}
			// Fallback for the cases where no transitionend arrives: reduced
			// motion, a display:none ancestor, an offscreen host, jsdom.
			const ms = reducedMotion ? 0 : (on ? FADE_IN_MS : FADE_OUT_MS) + FADE_SLACK_MS;
			fadeTimer = setTimeout(() => settle(on ? "in" : "out"), ms);
		});
		return () => clearTimeout(fadeTimer);
	});

	// --- shared animation loop ----------------------------------------------------

	$effect(() => {
		const host = ref;
		const config = oscillators;
		const hue = hueEnabled ? { period: motion.huePeriod } : null;
		if (!host || !running || reducedMotion) return;

		const handle = registerPulse(host, config, hue);
		let io: IntersectionObserver | undefined;
		if (typeof IntersectionObserver !== "undefined") {
			io = new IntersectionObserver(
				([entry]) => {
					if (entry) handle.setPaused(!entry.isIntersecting);
				},
				{ rootMargin: "256px" }
			);
			io.observe(host);
		}
		return () => {
			io?.disconnect();
			handle.unregister();
		};
	});

	// --- outside variant: scale blobs with the box --------------------------------

	$effect(() => {
		const host = ref;
		if (!host || variant !== "outside" || typeof ResizeObserver === "undefined") return;
		const clamp = (v: number) => Math.max(0.35, Math.min(4, v));
		const apply = () => {
			const r = host.getBoundingClientRect();
			if (!r.width || !r.height) return;
			host.style.setProperty("--pb-sx", clamp(r.width / 350).toFixed(3));
			host.style.setProperty("--pb-sy", clamp(r.height / 140).toFixed(3));
		};
		apply();
		const ro = new ResizeObserver(apply);
		ro.observe(host);
		return () => {
			ro.disconnect();
			host.style.removeProperty("--pb-sx");
			host.style.removeProperty("--pb-sy");
		};
	});
</script>

<!--
  The host carries only `style:` directives — never a `style` string. Svelte
  rewrites `cssText` when a style string changes, which would wipe the custom
  properties the loop writes every frame; directives update per key.
-->
<div
	bind:this={ref}
	class={cn("pulse-beam", className)}
	data-variant={variant}
	data-state={phase}
	style:--pb-strength={clampedStrength}
	style:--pb-radius="{radius}px"
	style:--pb-o-stroke={preset.stroke * monoFactor}
	style:--pb-o-glow={preset.glow * monoFactor}
	style:--pb-o-bloom={preset.bloom * monoFactor}
	style:--pb-brightness={brightness ?? preset.brightness}
	style:--pb-saturation={saturation ?? preset.saturation}
	style:--pb-glow-blur="{preset.glowBlur}px"
	style:--pb-bloom-blur="{preset.bloomBlur}px"
	{...restProps}
>
	{@render children?.()}
	<div class="pulse-beam__layer pulse-beam__glow" style:background={backgrounds.glow}></div>
	<div
		class="pulse-beam__layer pulse-beam__stroke"
		style:background={backgrounds.stroke}
		ontransitionend={handleTransitionEnd}
	></div>
	<div class="pulse-beam__layer pulse-beam__bloom" style:background={backgrounds.bloom}></div>
</div>

<style>
	.pulse-beam {
		position: relative;
		isolation: isolate;
		border-radius: var(--pb-radius);
		overflow: hidden;
	}

	.pulse-beam[data-variant="outside"] {
		overflow: visible;
	}

	.pulse-beam__layer {
		position: absolute;
		inset: 0;
		border-radius: var(--pb-radius);
		pointer-events: none;
		transition: opacity 600ms ease;
	}

	/* Filter runs before the mask: the bloom blurs its gradients, then the 1px
	   ring is cut from the blurred image — a softened ring, not a halo. */
	.pulse-beam__stroke,
	.pulse-beam__bloom {
		padding: 1px;
		clip-path: inset(0 round var(--pb-radius));
		-webkit-mask:
			linear-gradient(#fff 0 0) content-box,
			linear-gradient(#fff 0 0);
		-webkit-mask-composite: xor;
		mask:
			linear-gradient(#fff 0 0) content-box,
			linear-gradient(#fff 0 0);
		mask-composite: exclude;
	}

	.pulse-beam__stroke {
		z-index: 2;
		opacity: calc(var(--pb-o-stroke) * var(--pb-strength));
		filter: hue-rotate(var(--pb-hue, 0deg)) brightness(var(--pb-brightness))
			saturate(var(--pb-saturation));
	}

	.pulse-beam__glow {
		z-index: 1;
		clip-path: inset(0 round var(--pb-radius));
		-webkit-mask-image:
			linear-gradient(#fff, transparent 28px, transparent calc(100% - 28px), #fff),
			linear-gradient(to right, #fff, transparent 28px, transparent calc(100% - 28px), #fff);
		-webkit-mask-composite: source-over;
		mask-image:
			linear-gradient(#fff, transparent 28px, transparent calc(100% - 28px), #fff),
			linear-gradient(to right, #fff, transparent 28px, transparent calc(100% - 28px), #fff);
		mask-composite: add;
		opacity: calc(var(--pb-o-glow) * var(--pb-strength));
		filter: hue-rotate(var(--pb-hue, 0deg)) brightness(var(--pb-brightness))
			saturate(var(--pb-saturation));
	}

	.pulse-beam__bloom {
		z-index: 3;
		opacity: calc(var(--pb-o-bloom) * var(--pb-strength));
		filter: blur(var(--pb-bloom-blur)) hue-rotate(var(--pb-hue, 0deg))
			brightness(var(--pb-brightness)) saturate(var(--pb-saturation));
	}

	/* Outside: the stroke stays a ring; glow and bloom bleed past the box and
	   sit behind the (opaque) children inside the isolated stacking context. */
	.pulse-beam[data-variant="outside"] .pulse-beam__glow {
		inset: -10px;
		z-index: -1;
		border-radius: calc(var(--pb-radius) + 10px);
		clip-path: none;
		-webkit-mask: none;
		mask: none;
		transform: scale(0.95, 0.9);
		filter: blur(var(--pb-glow-blur)) hue-rotate(var(--pb-hue, 0deg))
			brightness(var(--pb-brightness)) saturate(var(--pb-saturation));
	}

	.pulse-beam[data-variant="outside"] .pulse-beam__bloom {
		inset: -30px;
		z-index: -1;
		border-radius: calc(var(--pb-radius) + 30px);
		padding: 0;
		clip-path: none;
		-webkit-mask: none;
		mask: none;
		transform: scale(0.95, 0.9);
	}

	/* Fade states */
	.pulse-beam[data-state="idle"] .pulse-beam__layer {
		opacity: 0;
		visibility: hidden;
		transition: none;
	}

	.pulse-beam[data-state="fading"] .pulse-beam__layer {
		opacity: 0;
		transition-duration: 500ms;
	}

	.pulse-beam[data-state="active"] .pulse-beam__layer,
	.pulse-beam[data-state="fading"] .pulse-beam__layer {
		will-change: opacity, filter;
	}

	@media (prefers-reduced-motion: reduce) {
		.pulse-beam__layer {
			transition: none;
		}
	}
</style>

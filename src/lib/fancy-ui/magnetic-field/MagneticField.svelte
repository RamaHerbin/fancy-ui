<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";
	import type {
		MagneticFieldSource,
		MagneticPoint,
		MagneticSpring,
		MagneticSpringPreset,
	} from "./magnetic-field-core.js";

	export interface MagneticFieldOwnProps {
		/** Where the magnet comes from. `"pointer"` follows a mouse or pen anywhere within `radius` of an item (touch is ignored); `"manual"` reads `position` instead. A `MagnetPuck` placed inside the field drives it in either mode while it is held. */
		source?: MagneticFieldSource;
		/** The magnet's position in px, relative to the field's padding box, used when `source` is `"manual"`. `null` means no magnet, and the items spring back to rest. */
		position?: MagneticPoint | null;
		/** Falloff distance from the item's edge, in px: an item pulls hardest when the magnet touches or overlaps it, and not at all once the magnet is `radius` px beyond its nearest edge. */
		radius?: number;
		/** Global pull multiplier, applied on top of each item's own `strength`. `0` turns the effect off without detaching anything. */
		strength?: number;
		/** Largest distance, in px, that any item travels toward the magnet. */
		maxTranslate?: number;
		/** Largest lean, in degrees. Items lean toward the magnet's side like a crowd turning its head: clockwise when it is to their left, counter-clockwise when it is to their right. */
		maxRotate?: number;
		/** How items move and settle: `"soft"`, `"default"` or `"snappy"`, or your own `{ stiffness, damping, mass }` (missing keys come from `"default"`). */
		spring?: MagneticSpringPreset | Partial<MagneticSpring>;
		/** `1` attracts and `-1` repels. Only translation flips; the lean stays the same. */
		polarity?: 1 | -1;
		/** Detaches every listener and springs each item back to rest. */
		disabled?: boolean;
		/** Called when the field wakes up (a magnet is engaged or an item is still settling) and when it goes back to sleep. */
		onActiveChange?: (active: boolean) => void;
		/** The content. Wrap each element that should react in a `MagneticItem`. */
		children?: Snippet;
		/** Additional CSS classes. */
		class?: string;
		/** Element reference (bindable). */
		ref?: HTMLDivElement | null;
	}

	/** Native `<div>` attributes and listeners are forwarded to the root. */
	export type MagneticFieldProps = MagneticFieldOwnProps &
		Omit<HTMLAttributes<HTMLDivElement>, keyof MagneticFieldOwnProps>;
</script>

<script lang="ts">
	import { setContext, untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import { inView } from "../_internals/motion/in-view.js";
	import { createReducedMotion } from "../_internals/motion/media-query.svelte.js";
	import {
		createMagneticFieldCore,
		createMagneticFieldHub,
		MAGNETIC_FIELD_DEFAULTS,
		resolveSpring,
		type MagneticFieldCore,
		type MagneticFieldOptions,
	} from "./magnetic-field-core.js";
	import { attachLayoutInvalidation, attachPointerSource } from "./magnetic-field-source.js";
	import { MAGNETIC_FIELD_KEY, type MagneticFieldContext } from "./types.js";

	let {
		source = "pointer",
		position = null,
		radius = MAGNETIC_FIELD_DEFAULTS.radius,
		strength = MAGNETIC_FIELD_DEFAULTS.strength,
		maxTranslate = MAGNETIC_FIELD_DEFAULTS.maxTranslate,
		maxRotate = MAGNETIC_FIELD_DEFAULTS.maxRotate,
		spring = "default",
		polarity = 1,
		disabled = false,
		onActiveChange,
		children,
		class: className,
		ref = $bindable(null),
		...rest
	}: MagneticFieldProps = $props();

	// One hub for the field's whole life: items and pucks register through it
	// whether or not the core exists yet, and it replays them into each core.
	const hub = createMagneticFieldHub();
	const context: MagneticFieldContext = hub;
	setContext(MAGNETIC_FIELD_KEY, context);

	const reduced = createReducedMotion();
	$effect(() => reduced.start());

	let core = $state.raw<MagneticFieldCore | null>(null);
	let active = $state(false);

	function handleActive(next: boolean) {
		active = next;
		onActiveChange?.(next);
	}

	function currentOptions(): Partial<MagneticFieldOptions> {
		return {
			radius,
			strength,
			maxTranslate,
			maxRotate,
			spring: resolveSpring(spring),
			polarity,
			reducedMotion: reduced.current,
			disabled,
			onActiveChange: handleActive,
		};
	}

	// The core lives exactly as long as the root node.
	$effect(() => {
		const node = ref;
		if (!node) return;
		const next = createMagneticFieldCore(
			node,
			untrack(() => currentOptions())
		);
		core = next;
		hub.attach(next);
		return () => {
			hub.detach();
			next.destroy();
			core = null;
			active = false;
		};
	});

	// Every prop change goes through one update; the core ignores no-ops.
	$effect(() => {
		const options = currentOptions();
		core?.update(options);
	});

	// Listeners exist only while something can move: the field is enabled,
	// motion is allowed, and the field (inflated by `radius`) is on screen.
	let onVisible: ((visible: boolean) => void) | null = null;
	$effect(() => {
		const c = core;
		const node = ref;
		if (!c || !node) return;
		const usePointer = source === "pointer";
		if (disabled || reduced.current || !usePointer) c.clearSource("pointer");
		if (disabled || reduced.current) return;

		let detachPointer: (() => void) | null = null;
		let detachLayout: (() => void) | null = null;

		onVisible = (visible: boolean) => {
			if (visible) {
				detachLayout ??= attachLayoutInvalidation(c);
				if (usePointer) detachPointer ??= attachPointerSource(c, node.ownerDocument, node);
			} else {
				detachPointer?.();
				detachPointer = null;
				detachLayout?.();
				detachLayout = null;
				c.clearSource("pointer");
			}
		};

		return () => {
			onVisible = null;
			detachPointer?.();
			detachLayout?.();
			c.clearSource("pointer");
		};
	});

	// The in-view observer alone depends on `radius`: a new margin replaces it
	// without detaching the pointer, so a resting pointer keeps pulling. It
	// reads the same state as the effect above, so it re-runs after it. Keep
	// this list in sync with that effect's reads: `onVisible` is not reactive.
	$effect(() => {
		const node = ref;
		void [core, source, disabled, reduced.current];
		const onChange = onVisible;
		if (!node || !onChange) return;
		const io = inView(node, {
			once: false,
			threshold: 0,
			rootMargin: `${radius}px`,
			onChange,
		}) as { destroy?: () => void } | void;
		return () => io?.destroy?.();
	});

	// The controlled magnet. Read through the hub so it survives a core swap.
	$effect(() => {
		const point = source === "manual" && position ? { x: position.x, y: position.y } : null;
		hub.setSource(point, "manual");
	});
</script>

<div
	bind:this={ref}
	class={cn("ft-magnetic-field", className)}
	{...rest}
	data-source={source}
	data-active={active || undefined}
>
	{@render children?.()}
</div>

<style>
	.ft-magnetic-field {
		position: relative;
	}
</style>

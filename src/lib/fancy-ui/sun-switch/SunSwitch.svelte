<script lang="ts" module>
	import type { HTMLButtonAttributes } from "svelte/elements";
	import type { SunPalette } from "./sun-switch-core.js";

	interface BaseProps {
		/** Day (true) or night (false); bindable. */
		checked?: boolean;
		/** Called with the new value from inside the view transition's update callback. */
		onCheckedChange?: (checked: boolean) => void;
		/** Sun radius in cells. The canvas is 2 × radius + 1 cells square. */
		radius?: number;
		/** Grid pitch in CSS pixels, shared by the sun, the wave front and its halo. */
		cell?: number;
		/** Size of each square dot in CSS pixels (at most `cell`). */
		dot?: number;
		/** Four colours from the top of the sun to the bottom. */
		palette?: SunPalette;
		/** Monochrome colour of the scene outside the lens. */
		ink?: string;
		/** Opacity of the ink sun at night. */
		nightAlpha?: number;
		/** Draws a few sparse rows of dots under the sun for the lens to reveal. */
		horizon?: boolean;
		/** On hover, a soft circular lens shows the true colours under the pointer. */
		lens?: boolean;
		/** Lens radius in cells. */
		lensRadius?: number;
		/** `document`: view transition over the page. `contained`: painted over `scope`. */
		mode?: "document" | "contained";
		/** The element the wave covers in contained mode. */
		scope?: HTMLElement | null;
		/** Colour of the old-state sheet in the fallback and contained paths. */
		fill?: string;
		/** Duration of the wave in milliseconds. */
		duration?: number;
		/** Thickness of the dithered halo leading the wave front, in cells. */
		haloCells?: number;
		/** Plays the toggle cue through the sound controller. */
		sound?: boolean;
		/** Accessible name of the switch. */
		label?: string;
		/** Blocks interaction. */
		disabled?: boolean;
		/** Additional CSS classes on the button. */
		class?: string;
		/** Element reference to the native `<button>`. */
		ref?: HTMLButtonElement | null;
	}

	export type SunSwitchProps = BaseProps &
		Omit<HTMLButtonAttributes, keyof BaseProps | "type" | "role" | "aria-checked">;
</script>

<script lang="ts">
	import { flushSync, untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import { inView } from "../_internals/motion/in-view.js";
	import { createReducedMotion } from "../_internals/motion/media-query.svelte.js";
	import { sound as soundFx } from "../sound/sound.svelte.js";
	import { isWaving, pixelWave } from "./pixel-wave-core.js";
	import { SUN_PALETTE, createSunPainter, type SunPainter } from "./sun-switch-core.js";

	let {
		checked = $bindable(true),
		onCheckedChange,
		radius = 10,
		cell = 5,
		dot = 4,
		palette = SUN_PALETTE,
		ink = "currentColor",
		nightAlpha = 0.42,
		horizon = true,
		lens = true,
		lensRadius = 7,
		mode = "document",
		scope = null,
		fill,
		duration = 1300,
		haloCells = 9,
		sound = false,
		label = "Day mode",
		disabled = false,
		class: className,
		ref = $bindable(null),
		onclick,
		onpointerenter,
		onpointermove,
		onpointerdown,
		onpointerup,
		onpointerleave,
		onpointercancel,
		onfocus,
		onblur,
		onkeydown,
		...rest
	}: SunSwitchProps = $props();

	const reduced = createReducedMotion();
	$effect(() => reduced.start());

	let canvas: HTMLCanvasElement;
	/** The canvas painter; null before mount and under jsdom (no 2D context). */
	let painter: SunPainter | null = null;
	/** True while THIS instance's wave runs (drives `aria-busy` / `data-waving`). */
	let waving = $state(false);

	/** Re-reads the resolved ink (computed `color` of the canvas, which is `ink`). */
	function readInk() {
		inkStale = false;
		if (!painter || !canvas) return;
		painter.setInk(getComputedStyle(canvas).color);
	}

	/** True while the painter sleeps (out of view or hidden document). */
	let asleep = false;
	/** An ink re-read was asked for while asleep; done on wake. */
	let inkStale = false;
	let inkFrame = 0;

	/** Coalesces ink re-reads to one per frame (each forces a style flush), and
	 * defers them while the painter sleeps. */
	function scheduleInk() {
		if (asleep) {
			inkStale = true;
			return;
		}
		if (inkFrame || typeof requestAnimationFrame !== "function") return;
		inkFrame = requestAnimationFrame(() => {
			inkFrame = 0;
			readInk();
		});
	}

	// Mount only: the painter lives for the component's lifetime. Prop reads are
	// untracked; prop changes reach it through the forwarding effects below.
	$effect(() => {
		const initial = untrack(() => ({
			radius,
			cell,
			dot,
			palette,
			nightAlpha,
			horizon,
			lens,
			lensRadius,
			checked,
			reducedMotion: reduced.current,
		}));
		const p = createSunPainter(canvas, initial);
		if (!p) return;
		painter = p;
		readInk();

		let visible = true;
		let hidden = document.visibilityState === "hidden";
		const sync = () => {
			asleep = !(visible && !hidden);
			if (asleep) {
				p.sleep();
				return;
			}
			if (inkStale) readInk();
			p.wake();
		};

		let ro: ResizeObserver | undefined;
		if (typeof ResizeObserver !== "undefined") {
			ro = new ResizeObserver(() => p.resize());
			try {
				// Also fires on a device-pixel-ratio change (zoom, moving screens).
				ro.observe(canvas, { box: "device-pixel-content-box" });
			} catch {
				ro.observe(canvas);
			}
		}

		const io = inView(canvas, {
			once: false,
			threshold: 0,
			onChange: (intersecting) => {
				visible = intersecting;
				sync();
			},
		}) as { destroy?: () => void } | void;

		const onVisibility = () => {
			hidden = document.visibilityState === "hidden";
			sync();
		};
		document.addEventListener("visibilitychange", onVisibility);

		// The ink follows the theme: re-read it when the document's theme hooks
		// or the colour scheme change, whatever system flips them, and again when
		// a `color` transition settles (the computed colour lags behind the flip).
		let mo: MutationObserver | undefined;
		if (typeof MutationObserver !== "undefined") {
			mo = new MutationObserver(scheduleInk);
			const attributeFilter = ["class", "style", "data-theme", "data-mode"];
			mo.observe(document.documentElement, { attributes: true, attributeFilter });
			mo.observe(document.body, { attributes: true, attributeFilter });
		}
		const scheme =
			typeof window.matchMedia === "function"
				? window.matchMedia("(prefers-color-scheme: dark)")
				: null;
		scheme?.addEventListener("change", scheduleInk);
		const onColorSettled = (event: TransitionEvent) => {
			// Only transitions on the canvas or its ancestors can change its colour.
			const target = event.target;
			if (event.propertyName !== "color" || !(target instanceof Node)) return;
			if (target.contains(canvas)) scheduleInk();
		};
		document.addEventListener("transitionend", onColorSettled, true);
		document.addEventListener("transitioncancel", onColorSettled, true);

		sync();

		return () => {
			ro?.disconnect();
			io?.destroy?.();
			mo?.disconnect();
			scheme?.removeEventListener("change", scheduleInk);
			document.removeEventListener("transitionend", onColorSettled, true);
			document.removeEventListener("transitioncancel", onColorSettled, true);
			document.removeEventListener("visibilitychange", onVisibility);
			if (inkFrame && typeof cancelAnimationFrame === "function") cancelAnimationFrame(inkFrame);
			inkFrame = 0;
			p.destroy();
			painter = null;
		};
	});

	// Layout props: re-raster and resize.
	$effect(() => {
		const next = { radius, cell, dot, horizon };
		untrack(() => painter?.setOptions(next));
	});

	// Appearance props: repaint in place.
	$effect(() => {
		const next = { palette, nightAlpha, lens, lensRadius };
		untrack(() => painter?.setOptions(next));
	});

	$effect(() => {
		const next = { checked };
		untrack(() => painter?.setOptions(next));
	});

	$effect(() => {
		const next = { reducedMotion: reduced.current };
		untrack(() => painter?.setOptions(next));
	});

	// `ink` lands on the canvas as `color`; effects run after the DOM update, so
	// the computed value is already the new one here.
	$effect(() => {
		void ink;
		untrack(readInk);
	});

	// INTERACTION: lens state. The lens opens while the pointer is over the
	// button (or the button has keyboard focus) and stays open through this
	// instance's own wave, whatever the pointer does meanwhile (a view transition
	// re-targets hit testing, so a `pointerleave` may arrive mid-wave).
	let hovering = false;
	let focused = false;
	let lensOpen = false;
	/** Last lens target in canvas cells. */
	let targetX = 0;
	let targetY = 0;
	let closeTimer: ReturnType<typeof setTimeout> | undefined;

	/** Side of the sun canvas in cells (the core rounds the radius the same way). */
	function sizeCells() {
		return 2 * Math.max(1, Math.round(radius)) + 1;
	}

	/** Disc centre in canvas cells. */
	function centreCells() {
		return Math.max(1, Math.round(radius)) + 0.5;
	}

	/** Pointer position in canvas cells, robust to CSS scaling of the button. */
	function trackPointer(event: PointerEvent) {
		if (!canvas) return;
		const r = canvas.getBoundingClientRect();
		const size = sizeCells();
		const sx = r.width > 0 ? size / r.width : 1 / cell;
		const sy = r.height > 0 ? size / r.height : 1 / cell;
		targetX = (event.clientX - r.left) * sx;
		targetY = (event.clientY - r.top) * sy;
	}

	function syncLens() {
		const want = lens && !disabled && (hovering || focused);
		lensOpen = want || (waving && lensOpen);
		if (focused && !hovering) {
			targetX = centreCells();
			targetY = centreCells();
		}
		painter?.pointer(targetX, targetY, lensOpen);
	}

	/** Closes on the next task, so a touch release that is followed by its
	 * `click` (same task) keeps the lens open for the wave that click starts. */
	function syncLensSoon() {
		clearTimeout(closeTimer);
		closeTimer = setTimeout(() => {
			closeTimer = undefined;
			syncLens();
		}, 0);
	}

	$effect(() => () => clearTimeout(closeTimer));

	// `lens` / `disabled` changes open or close the lens at once.
	$effect(() => {
		void lens;
		void disabled;
		untrack(syncLens);
	});

	function onPointerEnter(event: PointerEvent & { currentTarget: HTMLButtonElement }) {
		hovering = true;
		trackPointer(event);
		syncLens();
		onpointerenter?.(event);
	}

	function onPointerMove(event: PointerEvent & { currentTarget: HTMLButtonElement }) {
		hovering = true;
		trackPointer(event);
		syncLens();
		onpointermove?.(event);
	}

	// Touch opens the lens at the touch point (no hover before a tap).
	function onPointerDown(event: PointerEvent & { currentTarget: HTMLButtonElement }) {
		hovering = true;
		trackPointer(event);
		syncLens();
		onpointerdown?.(event);
	}

	// A touch release ends the "hover".
	function onPointerUp(event: PointerEvent & { currentTarget: HTMLButtonElement }) {
		if (event.pointerType === "touch") {
			hovering = false;
			syncLensSoon();
		}
		onpointerup?.(event);
	}

	// Closes the lens (held open while this instance is waving).
	function onPointerLeave(event: PointerEvent & { currentTarget: HTMLButtonElement }) {
		hovering = false;
		syncLensSoon();
		onpointerleave?.(event);
	}

	function onPointerCancel(event: PointerEvent & { currentTarget: HTMLButtonElement }) {
		hovering = false;
		syncLensSoon();
		onpointercancel?.(event);
	}

	// Keyboard focus opens the lens centred on the disc (the hover affordance
	// for keyboard users). Pointer focus does not: the pointer already drives it.
	function onFocus(event: FocusEvent & { currentTarget: HTMLButtonElement }) {
		let visible = false;
		try {
			visible = event.currentTarget.matches(":focus-visible");
		} catch {
			visible = false;
		}
		focused = visible;
		syncLens();
		onfocus?.(event);
	}

	function onBlur(event: FocusEvent & { currentTarget: HTMLButtonElement }) {
		focused = false;
		syncLensSoon();
		onblur?.(event);
	}

	// INTERACTION: click → wave.
	/** Value asked for by the latest click until its wave settles, so a click
	 * landing before the previous wave applied still toggles from the right state
	 * (intent is never dropped). */
	let intent: boolean | null = null;
	/** Identifies the latest click; only its wave may clear the shared state. */
	let token = 0;

	/** Minimum time between two theme flips: at most 3 full-page flips a second
	 * (photosensitivity), however fast the clicks come. */
	const MIN_FLIP_MS = 334;
	let lastFlipAt = -Infinity;
	/** Value asked for by clicks that came too soon, applied when the gap allows. */
	let pending: boolean | null = null;
	let pendingTimer: ReturnType<typeof setTimeout> | undefined;
	/** Removes the document listeners that catch clicks during a view transition. */
	let disarm: (() => void) | null = null;

	$effect(() => () => {
		clearTimeout(pendingTimer);
		pendingTimer = undefined;
		pending = null;
		disarm?.();
		disarm = null;
	});

	/** One more toggle asked for by the user, rate-limited without dropping intent. */
	function toggle() {
		if (disabled) return;
		const next = !(pending ?? intent ?? checked);
		const wait = lastFlipAt + MIN_FLIP_MS - window.performance.now();
		if (wait > 0) {
			pending = next;
			pendingTimer ??= setTimeout(flushPending, wait);
			return;
		}
		pending = null;
		startWave(next);
	}

	function flushPending() {
		pendingTimer = undefined;
		const next = pending;
		pending = null;
		// An even number of early clicks asks for the current state: nothing to do.
		if (next === null || disabled || next === (intent ?? checked)) return;
		startWave(next);
	}

	/** Whether a viewport point falls on the button. */
	function overButton(x: number, y: number): boolean {
		const r = ref?.getBoundingClientRect();
		return !!r && x >= r.left && x < r.right && y >= r.top && y < r.bottom;
	}

	/**
	 * While a document-mode wave runs, the view transition hit-tests every point
	 * as `<html>`, so the button never sees the pointer. Catch those events on
	 * the document and route the ones over the button back to it.
	 */
	function armReentry() {
		if (disarm || mode !== "document") return;
		const root = document.documentElement;
		const onDown = (event: PointerEvent) => {
			// Keep focus on the switch instead of moving it to <body>.
			if (event.target === root && overButton(event.clientX, event.clientY)) {
				event.preventDefault();
			}
		};
		const onMove = (event: PointerEvent) => {
			if (event.target !== root || !overButton(event.clientX, event.clientY)) return;
			hovering = true;
			trackPointer(event);
			syncLens();
		};
		const onDocClick = (event: MouseEvent) => {
			if (event.target === root && overButton(event.clientX, event.clientY)) toggle();
		};
		document.addEventListener("pointerdown", onDown, true);
		document.addEventListener("pointermove", onMove, true);
		document.addEventListener("click", onDocClick, true);
		disarm = () => {
			document.removeEventListener("pointerdown", onDown, true);
			document.removeEventListener("pointermove", onMove, true);
			document.removeEventListener("click", onDocClick, true);
		};
	}

	// Auto-repeated Enter would click on every repeat: a full-page flash train.
	function onKeyDown(event: KeyboardEvent & { currentTarget: HTMLButtonElement }) {
		if (event.repeat && (event.key === "Enter" || event.key === " ")) event.preventDefault();
		onkeydown?.(event);
	}

	function isHovered(): boolean {
		try {
			return !!ref?.matches(":hover");
		} catch {
			return false;
		}
	}

	function onClick(event: MouseEvent & { currentTarget: HTMLButtonElement }) {
		toggle();
		onclick?.(event);
	}

	function startWave(next: boolean) {
		lastFlipAt = window.performance.now();
		intent = next;
		const id = ++token;
		// User activation: play before the view transition starts.
		if (sound) soundFx.play(next ? "toggle-on" : "toggle-off");

		const instant = reduced.current || isWaving();
		const rect = canvas?.getBoundingClientRect();
		const centre = centreCells() * cell;
		let origin = { x: (rect?.left ?? 0) + centre, y: (rect?.top ?? 0) + centre };
		if (mode === "contained" && scope) {
			const sr = scope.getBoundingClientRect();
			origin = {
				x: origin.x - sr.left - scope.clientLeft,
				y: origin.y - sr.top - scope.clientTop,
			};
		}
		const oldInk = canvas ? getComputedStyle(canvas).color : "";
		const front = (outer: number) => ({
			cx: centre,
			cy: centre,
			R: Math.max(0, outer - haloCells + 0.5) * cell,
			nextChecked: next,
			oldInk,
		});

		waving = !instant;
		if (!instant) armReentry();
		// Hold the old look on the canvas until the front reaches each cell; the
		// canvas renders live above the snapshots during a view transition.
		painter?.setFront(instant ? null : front(0));

		void pixelWave({
			origin,
			mode,
			scope,
			live: canvas ?? null,
			fill,
			cell,
			dot,
			haloCells,
			duration,
			palette,
			reducedMotion: reduced.current,
			apply: () => {
				checked = next;
				onCheckedChange?.(next);
				// Commit the DOM now: the view transition captures the new state
				// right after this callback returns.
				flushSync();
				readInk();
				// Again once styles settle (a transition may still hold the old colour).
				scheduleInk();
			},
			onFront: (outer) => {
				if (id === token) painter?.setFront(front(outer));
			},
		}).then(() => {
			if (id !== token) return;
			intent = null;
			waving = false;
			disarm?.();
			disarm = null;
			painter?.setFront(null);
			hovering = isHovered();
			syncLens();
		});
	}
</script>

<button
	{...rest}
	bind:this={ref}
	type="button"
	role="switch"
	aria-checked={checked ? "true" : "false"}
	aria-label={label}
	aria-busy={waving ? "true" : undefined}
	data-state={checked ? "day" : "night"}
	data-waving={waving ? "" : undefined}
	{disabled}
	class={cn("ft-sun-switch", className)}
	style:--ft-sun-r={Math.max(1, Math.round(radius))}
	style:--ft-sun-cell="{cell}px"
	onclick={onClick}
	onpointerenter={onPointerEnter}
	onpointermove={onPointerMove}
	onpointerdown={onPointerDown}
	onpointerup={onPointerUp}
	onpointerleave={onPointerLeave}
	onpointercancel={onPointerCancel}
	onfocus={onFocus}
	onblur={onBlur}
	onkeydown={onKeyDown}
>
	<canvas bind:this={canvas} class="ft-sun-switch-canvas" aria-hidden="true" style:color={ink}
	></canvas>
</button>

<style>
	.ft-sun-switch {
		appearance: none;
		background: none;
		border: 0;
		padding: 0;
		margin: 0;
		display: inline-block;
		line-height: 0;
		color: inherit;
		cursor: pointer;
		touch-action: manipulation;
		border-radius: 4px;
		-webkit-tap-highlight-color: transparent;
	}

	.ft-sun-switch:focus-visible {
		outline: 2px solid var(--ft-accent, currentColor);
		outline-offset: 2px;
	}

	.ft-sun-switch:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.ft-sun-switch-canvas {
		display: block;
		width: calc((2 * var(--ft-sun-r) + 1) * var(--ft-sun-cell));
		height: calc((2 * var(--ft-sun-r) + 1) * var(--ft-sun-cell));
		image-rendering: pixelated;
		pointer-events: none;
	}
</style>

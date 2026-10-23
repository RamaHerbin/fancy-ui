import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import type {
	ComponentPropsWithoutRef,
	CSSProperties,
	FocusEvent as ReactFocusEvent,
	KeyboardEvent as ReactKeyboardEvent,
	MouseEvent as ReactMouseEvent,
	PointerEvent as ReactPointerEvent,
} from "react";
import { flushSync } from "react-dom";
import { cn } from "../../utils.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { observeInView } from "../../internals/motion/in-view.js";
import { useReducedMotion } from "../../internals/motion/media-query.js";
import { useSoundCue } from "../../sound/use-sound.js";
import { flipWait, isWaving, markFlip, pixelWave } from "./pixel-wave-core.js";
import { SUN_PALETTE, createSunPainter } from "./sun-switch-core.js";
import type { SunFront, SunPainter, SunPalette } from "./sun-switch-core.js";
import {
	SUN_HDR_RESTART_MS,
	SUN_HDR_RESTARTS,
	startSunHdr,
	sunHdrAvailable,
} from "./sun-switch-hdr.js";
import "./sun-switch.css";

interface SunSwitchOwnProps {
	/**
	 * Day (true) or night (false). Controlled when supplied: pair it with
	 * `onCheckedChange`, the React counterpart of the Svelte source's
	 * `bind:checked`.
	 */
	checked?: boolean;
	/** Initial day/night state when uncontrolled (no `checked` prop given). */
	defaultChecked?: boolean;
	/**
	 * Called with the new value from inside the view transition's update
	 * callback. Flip your theme here; the component never changes classes on
	 * the document. It runs inside `flushSync`, so a React state update made
	 * here is committed before the transition takes its "new" snapshot.
	 */
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
	/** On HDR displays, the sun and the wave halo glow above SDR white (WebGPU). */
	hdr?: boolean;
	/** Plays the toggle cue through the sound controller. */
	sound?: boolean;
	/** Accessible name of the switch. */
	label?: string;
	/** Blocks interaction. */
	disabled?: boolean;
	/** Additional CSS classes on the button. */
	className?: string;
}

export interface SunSwitchProps
	extends
		Omit<
			ComponentPropsWithoutRef<"button">,
			keyof SunSwitchOwnProps | "type" | "role" | "aria-checked" | "onChange"
		>,
		SunSwitchOwnProps {}

/**
 * A theme switch drawn as a pixel sun. Hover it and a soft lens shows its true
 * colours; click it and the new theme spreads from the sun in a grid-aligned
 * staircase, led by a dithered halo, as a view transition.
 *
 * The element reference arrives through the ref channel (the Svelte source
 * declares `ref = $bindable(null)`), pointing at the native `<button>`.
 */
export const SunSwitch = forwardRef<HTMLButtonElement, SunSwitchProps>(
	(
		{
			checked: checkedProp,
			defaultChecked = true,
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
			hdr = true,
			sound = false,
			label = "Day mode",
			disabled = false,
			className,
			style,
			onClick,
			onPointerEnter,
			onPointerMove,
			onPointerDown,
			onPointerUp,
			onPointerLeave,
			onPointerCancel,
			onFocus,
			onBlur,
			onKeyDown,
			...rest
		},
		forwardedRef
	) => {
		const isControlled = checkedProp !== undefined;
		const [uncontrolledChecked, setUncontrolledChecked] = useState(defaultChecked);
		const checked = isControlled ? checkedProp : uncontrolledChecked;

		const reduced = useReducedMotion();
		const playCue = useSoundCue(sound);

		const buttonRef = useRef<HTMLButtonElement | null>(null);
		const composedRef = useComposedRefs(forwardedRef, buttonRef);
		const canvasRef = useRef<HTMLCanvasElement | null>(null);
		/** The canvas painter; null before mount and under jsdom (no 2D context). */
		const painterRef = useRef<SunPainter | null>(null);
		/** Set once the painter exists, so the HDR effect can attach to it. */
		const [painterReady, setPainterReady] = useState(false);
		const [hdrCanvas, hdrCanvasRef] = useElementRef<HTMLCanvasElement>();
		/** False on the server and the first client render: the HDR canvas appears only after mount. */
		const [hdrCapable, setHdrCapable] = useState(false);
		const [hdrOn, setHdrOn] = useState(false);
		/** Bumped to start the HDR layer again after a device loss; the effect below depends on it. */
		const [hdrRun, setHdrRun] = useState(0);
		const hdrRestarts = useRef(0);
		/** True while THIS instance's wave runs (drives `aria-busy` / `data-waving`). */
		const [waving, setWavingState] = useState(false);
		const wavingRef = useRef(false);
		const setWaving = useCallback((value: boolean) => {
			if (wavingRef.current === value) return;
			wavingRef.current = value;
			setWavingState(value);
		}, []);

		// Long-lived closures (the mount effect, the wave's callbacks) read the
		// latest render through this ref instead of being rebuilt.
		const live = useLiveRef({
			checked,
			isControlled,
			onCheckedChange,
			radius,
			cell,
			dot,
			palette,
			nightAlpha,
			horizon,
			lens,
			lensRadius,
			mode,
			scope,
			fill,
			duration,
			haloCells,
			hdr,
			hdrCanvas,
			disabled,
			reduced,
		});

		/** Ink re-read bookkeeping: `asleep` while the painter sleeps, `stale` when a
		 * re-read was asked for meanwhile, `frame` for the coalescing rAF. */
		const inkState = useRef({ asleep: false, stale: false, frame: 0 });

		/** Re-reads the resolved ink (computed `color` of the canvas, which is `ink`). */
		const readInk = useCallback(() => {
			inkState.current.stale = false;
			const painter = painterRef.current;
			const canvas = canvasRef.current;
			if (!painter || !canvas) return;
			painter.setInk(getComputedStyle(canvas).color);
		}, []);

		/** Coalesces ink re-reads to one per frame (each forces a style flush), and
		 * defers them while the painter sleeps. */
		const scheduleInk = useCallback(() => {
			const s = inkState.current;
			if (s.asleep) {
				s.stale = true;
				return;
			}
			if (s.frame || typeof requestAnimationFrame !== "function") return;
			s.frame = requestAnimationFrame(() => {
				s.frame = 0;
				readInk();
			});
		}, [readInk]);

		// Mount only: the painter lives for the component's lifetime. Prop
		// changes reach it through the forwarding effects below.
		useEffect(() => {
			const canvas = canvasRef.current;
			if (!canvas) return;
			const v = live.current;
			const p = createSunPainter(canvas, {
				radius: v.radius,
				cell: v.cell,
				dot: v.dot,
				palette: v.palette,
				nightAlpha: v.nightAlpha,
				horizon: v.horizon,
				lens: v.lens,
				lensRadius: v.lensRadius,
				checked: v.checked,
				reducedMotion: v.reduced,
			});
			if (!p) return;
			painterRef.current = p;
			setPainterReady(true);
			readInk();

			let visible = true;
			let hidden = document.visibilityState === "hidden";
			const ink = inkState.current;
			const sync = () => {
				ink.asleep = !(visible && !hidden);
				if (ink.asleep) {
					p.sleep();
					return;
				}
				if (ink.stale) readInk();
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

			const io = observeInView(canvas, {
				once: false,
				threshold: 0,
				onChange: (intersecting) => {
					visible = intersecting;
					sync();
				},
			});

			const onVisibility = () => {
				hidden = document.visibilityState === "hidden";
				sync();
			};
			document.addEventListener("visibilitychange", onVisibility);

			// The ink follows the theme: re-read it when the document's theme
			// hooks or the colour scheme change, whatever system flips them, and
			// again when a `color` transition settles (the computed colour lags
			// behind the flip).
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
				io.destroy();
				mo?.disconnect();
				scheme?.removeEventListener("change", scheduleInk);
				document.removeEventListener("transitionend", onColorSettled, true);
				document.removeEventListener("transitioncancel", onColorSettled, true);
				document.removeEventListener("visibilitychange", onVisibility);
				if (ink.frame && typeof cancelAnimationFrame === "function") {
					cancelAnimationFrame(ink.frame);
				}
				ink.frame = 0;
				p.destroy();
				if (painterRef.current === p) painterRef.current = null;
				setPainterReady(false);
			};
		}, [live, readInk, scheduleInk]);

		// HDR: decided after mount only, so SSR and hydration render the 2D canvas alone.
		useEffect(() => {
			setHdrCapable(hdr && sunHdrAvailable());
		}, [hdr]);

		useEffect(() => {
			const p = painterRef.current;
			if (!hdrCanvas || !painterReady || !hdrCapable || !p) return;
			let cancelled = false;
			let stop: (() => void) | null = null;
			let retry: ReturnType<typeof setTimeout> | null = null;
			// A lost device usually comes back (GPU process restarted, driver reset):
			// start again after a growing pause, a few times, before giving the layer up.
			const restart = () => {
				if (hdrRestarts.current >= SUN_HDR_RESTARTS) {
					setHdrCapable(false);
					return;
				}
				hdrRestarts.current++;
				retry = setTimeout(() => {
					retry = null;
					setHdrRun((n) => n + 1);
				}, SUN_HDR_RESTART_MS * hdrRestarts.current);
			};
			void startSunHdr(hdrCanvas).then((layer) => {
				if (cancelled || painterRef.current !== p) {
					layer?.destroy();
					return;
				}
				if (!layer) {
					// Nothing to start on the first try (no adapter, tone mapping refused): give
					// up at once. During a restart the GPU may still be on its way back.
					if (hdrRestarts.current === 0) setHdrCapable(false);
					else restart();
					return;
				}
				p.setGlowTarget(layer);
				setHdrOn(true);
				stop = () => {
					p.setGlowTarget(null);
					layer.destroy();
					setHdrOn(false);
				};
				void layer.lost.then(() => {
					if (cancelled) return;
					stop?.();
					stop = null;
					restart();
				});
			});
			return () => {
				cancelled = true;
				stop?.();
				stop = null;
				if (retry !== null) clearTimeout(retry);
			};
			// hdrRun is read by no line above: it re-runs the effect after a device loss.
		}, [hdrCanvas, painterReady, hdrCapable, hdrRun]);

		// Layout props: re-raster and resize.
		useEffect(() => {
			painterRef.current?.setOptions({ radius, cell, dot, horizon });
		}, [radius, cell, dot, horizon]);

		// Appearance props: repaint in place.
		useEffect(() => {
			painterRef.current?.setOptions({ palette, nightAlpha, lens, lensRadius });
		}, [palette, nightAlpha, lens, lensRadius]);

		useEffect(() => {
			painterRef.current?.setOptions({ checked });
		}, [checked]);

		useEffect(() => {
			painterRef.current?.setOptions({ reducedMotion: reduced });
		}, [reduced]);

		// `ink` lands on the canvas as `color`; effects run after the DOM
		// update, so the computed value is already the new one here.
		useEffect(() => {
			readInk();
		}, [ink, readInk]);

		// Lens state. The lens opens while the pointer is over the button (or
		// the button has keyboard focus) and stays open through this instance's
		// own wave, whatever the pointer does meanwhile (a view transition
		// re-targets hit testing, so a `pointerleave` may arrive mid-wave).
		const lensState = useRef({
			hovering: false,
			focused: false,
			open: false,
			/** Last lens target in canvas cells. */
			x: 0,
			y: 0,
			closeTimer: undefined as ReturnType<typeof setTimeout> | undefined,
		});

		/** Side of the sun canvas in cells (the core rounds the radius the same way). */
		const sizeCells = useCallback(
			() => 2 * Math.max(1, Math.round(live.current.radius)) + 1,
			[live]
		);

		/** Disc centre in canvas cells. */
		const centreCells = useCallback(
			() => Math.max(1, Math.round(live.current.radius)) + 0.5,
			[live]
		);

		/** Pointer position in canvas cells, robust to CSS scaling of the button. */
		const trackPointer = useCallback(
			(event: { clientX: number; clientY: number }) => {
				const canvas = canvasRef.current;
				if (!canvas) return;
				const r = canvas.getBoundingClientRect();
				const size = sizeCells();
				const sx = r.width > 0 ? size / r.width : 1 / live.current.cell;
				const sy = r.height > 0 ? size / r.height : 1 / live.current.cell;
				lensState.current.x = (event.clientX - r.left) * sx;
				lensState.current.y = (event.clientY - r.top) * sy;
			},
			[live, sizeCells]
		);

		const syncLens = useCallback(() => {
			const s = lensState.current;
			const { lens: lensOn, disabled: off } = live.current;
			const want = lensOn && !off && (s.hovering || s.focused);
			s.open = want || (wavingRef.current && s.open);
			if (s.focused && !s.hovering) {
				s.x = centreCells();
				s.y = centreCells();
			}
			painterRef.current?.pointer(s.x, s.y, s.open);
		}, [live, centreCells]);

		/** Closes on the next task, so a touch release that is followed by its
		 * `click` (same task) keeps the lens open for the wave that click starts. */
		const syncLensSoon = useCallback(() => {
			const s = lensState.current;
			clearTimeout(s.closeTimer);
			s.closeTimer = setTimeout(() => {
				s.closeTimer = undefined;
				syncLens();
			}, 0);
		}, [syncLens]);

		useEffect(() => {
			const s = lensState.current;
			return () => clearTimeout(s.closeTimer);
		}, []);

		// `lens` / `disabled` changes open or close the lens at once.
		useEffect(() => {
			syncLens();
		}, [lens, disabled, syncLens]);

		function handlePointerEnter(event: ReactPointerEvent<HTMLButtonElement>) {
			lensState.current.hovering = true;
			trackPointer(event);
			syncLens();
			onPointerEnter?.(event);
		}

		function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
			lensState.current.hovering = true;
			trackPointer(event);
			syncLens();
			onPointerMove?.(event);
		}

		// Touch opens the lens at the touch point (no hover before a tap).
		function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
			lensState.current.hovering = true;
			trackPointer(event);
			syncLens();
			onPointerDown?.(event);
		}

		// A touch release ends the "hover".
		function handlePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
			if (event.pointerType === "touch") {
				lensState.current.hovering = false;
				syncLensSoon();
			}
			onPointerUp?.(event);
		}

		// Closes the lens (held open while this instance is waving).
		function handlePointerLeave(event: ReactPointerEvent<HTMLButtonElement>) {
			lensState.current.hovering = false;
			syncLensSoon();
			onPointerLeave?.(event);
		}

		function handlePointerCancel(event: ReactPointerEvent<HTMLButtonElement>) {
			lensState.current.hovering = false;
			syncLensSoon();
			onPointerCancel?.(event);
		}

		// Keyboard focus opens the lens centred on the disc (the hover
		// affordance for keyboard users). Pointer focus does not: the pointer
		// already drives it.
		function handleFocus(event: ReactFocusEvent<HTMLButtonElement>) {
			let visible = false;
			try {
				visible = event.currentTarget.matches(":focus-visible");
			} catch {
				visible = false;
			}
			lensState.current.focused = visible;
			syncLens();
			onFocus?.(event);
		}

		function handleBlur(event: ReactFocusEvent<HTMLButtonElement>) {
			lensState.current.focused = false;
			syncLensSoon();
			onBlur?.(event);
		}

		// Click → wave.
		/** Value asked for by the latest click until its wave settles, so a
		 * click landing before the previous wave applied still toggles from the
		 * right state (intent is never dropped). */
		const intentRef = useRef<boolean | null>(null);
		/** Identifies the latest click; only its wave may clear the shared state. */
		const tokenRef = useRef(0);

		/** Flip rate limit (page-wide through `flipWait`: at most 3 full-page flips
		 * a second, photosensitivity): the value asked for by clicks that came too
		 * soon, its timer, and the remover of the re-entry listeners. */
		const flipRef = useRef({
			pending: null as boolean | null,
			timer: undefined as ReturnType<typeof setTimeout> | undefined,
			disarm: null as (() => void) | null,
		});
		/** The latest render's handlers, for long-lived listeners and timers. */
		const actionsRef = useRef({
			flushPending: () => {},
			onReentryMove: (_event: PointerEvent) => {},
		});

		useEffect(() => {
			const f = flipRef.current;
			return () => {
				clearTimeout(f.timer);
				f.timer = undefined;
				f.pending = null;
				f.disarm?.();
				f.disarm = null;
			};
		}, []);

		/** One more toggle asked for by the user, rate-limited without dropping intent. */
		function toggle() {
			const f = flipRef.current;
			const v = live.current;
			if (v.disabled) return;
			const next = !(f.pending ?? intentRef.current ?? v.checked);
			const wait = flipWait(window.performance.now());
			if (wait > 0) {
				f.pending = next;
				f.timer ??= setTimeout(() => actionsRef.current.flushPending(), wait);
				return;
			}
			f.pending = null;
			startWave(next);
		}

		function flushPending() {
			const f = flipRef.current;
			f.timer = undefined;
			// Another switch may have flipped meanwhile: wait for the page-wide gap.
			const wait = flipWait(window.performance.now());
			if (wait > 0 && f.pending !== null) {
				f.timer = setTimeout(() => actionsRef.current.flushPending(), wait);
				return;
			}
			const next = f.pending;
			f.pending = null;
			const v = live.current;
			// An even number of early clicks asks for the current state: nothing to do.
			if (next === null || v.disabled || next === (intentRef.current ?? v.checked)) return;
			startWave(next);
		}

		function onReentryMove(event: PointerEvent) {
			lensState.current.hovering = true;
			trackPointer(event);
			syncLens();
		}

		actionsRef.current = { flushPending, onReentryMove };

		/** Whether a viewport point falls on the button. */
		function overButton(x: number, y: number): boolean {
			const r = buttonRef.current?.getBoundingClientRect();
			return !!r && x >= r.left && x < r.right && y >= r.top && y < r.bottom;
		}

		/**
		 * While a document-mode wave runs, the view transition hit-tests every
		 * point as `<html>`, so the button never sees the pointer. Catch those
		 * events on the document and route the ones over the button back to it.
		 */
		function armReentry() {
			const f = flipRef.current;
			if (f.disarm || live.current.mode !== "document") return;
			const root = document.documentElement;
			const onDown = (event: PointerEvent) => {
				// Keep focus on the switch instead of moving it to <body>.
				if (event.target === root && overButton(event.clientX, event.clientY)) {
					event.preventDefault();
				}
			};
			const onMove = (event: PointerEvent) => {
				if (event.target !== root || !overButton(event.clientX, event.clientY)) return;
				actionsRef.current.onReentryMove(event);
			};
			const onDocClick = (event: MouseEvent) => {
				// Through the button, so the consumer's click handler runs too.
				if (event.target === root && overButton(event.clientX, event.clientY)) {
					buttonRef.current?.click();
				}
			};
			document.addEventListener("pointerdown", onDown, true);
			document.addEventListener("pointermove", onMove, true);
			document.addEventListener("click", onDocClick, true);
			f.disarm = () => {
				document.removeEventListener("pointerdown", onDown, true);
				document.removeEventListener("pointermove", onMove, true);
				document.removeEventListener("click", onDocClick, true);
			};
		}

		// Auto-repeated Enter would click on every repeat: a full-page flash train.
		function handleKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
			if (event.repeat && (event.key === "Enter" || event.key === " ")) event.preventDefault();
			onKeyDown?.(event);
		}

		function isHovered(): boolean {
			try {
				return !!buttonRef.current?.matches(":hover");
			} catch {
				return false;
			}
		}

		function startWave(next: boolean) {
			const v = live.current;
			markFlip(window.performance.now());
			intentRef.current = next;
			const id = ++tokenRef.current;
			// User activation: play before the view transition starts.
			playCue(next ? "toggle-on" : "toggle-off");

			const canvas = canvasRef.current;
			const instant = v.reduced || isWaving();
			const rect = canvas?.getBoundingClientRect();
			const centre = centreCells() * v.cell;
			// The visible centre, robust to CSS scaling of the button.
			const nominal = sizeCells() * v.cell;
			const sx = rect && rect.width > 0 ? rect.width / nominal : 1;
			const sy = rect && rect.height > 0 ? rect.height / nominal : 1;
			let origin = { x: (rect?.left ?? 0) + centre * sx, y: (rect?.top ?? 0) + centre * sy };
			const scopeEl = v.scope;
			if (v.mode === "contained" && scopeEl) {
				const sr = scopeEl.getBoundingClientRect();
				origin = {
					x: origin.x - sr.left - scopeEl.clientLeft,
					y: origin.y - sr.top - scopeEl.clientTop,
				};
			}
			const oldInk = canvas ? getComputedStyle(canvas).color : "";
			const halo = v.haloCells;
			const cellPx = v.cell;
			const front = (outer: number): SunFront => ({
				cx: centre,
				cy: centre,
				R: Math.max(0, outer - halo + 0.5) * cellPx,
				nextChecked: next,
				oldInk,
			});

			setWaving(!instant);
			if (!instant) armReentry();
			// Hold the old look on the canvas until the front reaches each cell;
			// the canvas renders live above the snapshots during a view transition.
			painterRef.current?.setFront(instant ? null : front(0));

			void pixelWave({
				origin,
				mode: v.mode,
				scope: v.scope,
				live: canvas ?? null,
				liveHdr: v.hdrCanvas,
				hdr: v.hdr,
				fill: v.fill,
				cell: v.cell,
				dot: v.dot,
				haloCells: v.haloCells,
				duration: v.duration,
				palette: v.palette,
				reducedMotion: v.reduced,
				apply: () => {
					// Commit the DOM now: the view transition captures the new
					// state right after this callback returns. The consumer's
					// callback runs inside the flush too, so a theme kept in React
					// state lands in the same commit.
					flushSync(() => {
						if (!live.current.isControlled) setUncontrolledChecked(next);
						live.current.onCheckedChange?.(next);
					});
					readInk();
					// Again once styles settle (a transition may still hold the old colour).
					scheduleInk();
				},
				onFront: (outer) => {
					if (id === tokenRef.current) painterRef.current?.setFront(front(outer));
				},
			}).then(() => {
				if (id !== tokenRef.current) return;
				intentRef.current = null;
				setWaving(false);
				flipRef.current.disarm?.();
				flipRef.current.disarm = null;
				painterRef.current?.setFront(null);
				lensState.current.hovering = isHovered();
				syncLens();
			});
		}

		function handleClick(event: ReactMouseEvent<HTMLButtonElement>) {
			toggle();
			onClick?.(event);
		}

		const sunR = Math.max(1, Math.round(radius));

		return (
			<button
				{...rest}
				ref={composedRef}
				type="button"
				role="switch"
				aria-checked={checked ? "true" : "false"}
				aria-label={label}
				aria-busy={waving ? "true" : undefined}
				data-state={checked ? "day" : "night"}
				data-waving={waving ? "" : undefined}
				data-hdr={hdrOn ? "" : undefined}
				disabled={disabled}
				className={cn("ft-sun-switch", className)}
				style={
					{
						...style,
						"--ft-sun-r": sunR,
						"--ft-sun-cell": `${cell}px`,
					} as CSSProperties
				}
				onClick={handleClick}
				onPointerEnter={handlePointerEnter}
				onPointerMove={handlePointerMove}
				onPointerDown={handlePointerDown}
				onPointerUp={handlePointerUp}
				onPointerLeave={handlePointerLeave}
				onPointerCancel={handlePointerCancel}
				onFocus={handleFocus}
				onBlur={handleBlur}
				onKeyDown={handleKeyDown}
			>
				<canvas
					ref={canvasRef}
					className="ft-sun-switch-canvas"
					aria-hidden="true"
					style={{ color: ink }}
				/>
				{hdrCapable ? (
					<canvas ref={hdrCanvasRef} className="ft-sun-switch-hdr" aria-hidden="true" />
				) : null}
			</button>
		);
	}
);

SunSwitch.displayName = "SunSwitch";

import { useEffect, useRef, useState } from "react";
import { useIsomorphicLayoutEffect } from "../../internals/dom/ssr.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { REDUCED_MOTION_QUERY, useReducedMotion } from "../../internals/motion/media-query.js";
import { cn } from "../../utils.js";
import {
	createLiquidText,
	measureLiquidText,
	DEFAULT_DISPLAY_FONT_SIZE,
	HEIGHT_RATIO,
	type LiquidTextEngine,
} from "./liquid-text-core.js";
import "./liquid-text.css";

export interface LiquidTextProps {
	/** Text rendered into the fluid texture (or as static fallback text). */
	text?: string;
	/** CSS font-family. Empty string resolves to getComputedStyle(host).fontFamily. */
	font?: string;
	/** Font size in px. 0 auto-fits the text to the container's width. */
	fontSize?: number;
	/** CSS font-weight for the rasterized/fallback text. */
	fontWeight?: number | string;
	/** Text color used in light mode. */
	lightColor?: string;
	/** Text color used in dark mode. */
	darkColor?: string;
	/** Additional CSS classes applied to the root element. */
	className?: string;
	/** Geometric UV warp gain — how far the fluid velocity displaces the text's UVs. */
	strength?: number;
	/** Splat radius in screen pixels around the pointer. */
	radius?: number;
	/** Multiplier from mouse-delta-per-frame to splat force. */
	forceGain?: number;
	/** Per-frame velocity decay factor (relax-back rate for the smear). */
	dissipation?: number;
	/** Viscous diffusion strength (Jacobi iteration, 8 iters). */
	viscosity?: number;
	/** Chromatic offset = warp amount x this ratio. */
	chromaticRatio?: number;
	/** If window.innerWidth <= staticBelow at mount, render static DOM text instead. */
	staticBelow?: number;
	/** Whether the fluid sim reacts to pointer movement. */
	interactive?: boolean;
	/** Pause the render loop via visibilitychange when the tab/page is hidden. */
	pauseWhenHidden?: boolean;
}

function activeThemeColor(lightColor: string, darkColor: string): string {
	return typeof document !== "undefined" && document.documentElement.classList.contains("dark")
		? darkColor
		: lightColor;
}

export function LiquidText({
	text = "Liquid",
	font = "",
	fontSize = 0,
	fontWeight = 700,
	lightColor = "#000000",
	darkColor = "#ffffff",
	className = "",
	strength = 0.5,
	radius = 160,
	forceGain = 17,
	dissipation = 0.98,
	viscosity = 4,
	chromaticRatio = 0.2,
	staticBelow = 1024,
	interactive = true,
	pauseWhenHidden = true,
}: LiquidTextProps) {
	const rootRef = useRef<HTMLDivElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const reducedMotion = useReducedMotion();

	// Always starts "static" so the very first render (SSR or hydration) never
	// touches window/document — the mount effect promotes to "canvas" if
	// eligible.
	const [mode, setMode] = useState<"static" | "canvas">("static");
	const [themeColor, setThemeColor] = useState(lightColor);
	const [resolvedFont, setResolvedFont] = useState(font);
	const [displayFontSize, setDisplayFontSize] = useState(
		fontSize > 0 ? fontSize : DEFAULT_DISPLAY_FONT_SIZE
	);

	// The fluid sim lives in the framework-free engine shared with the Svelte
	// and Vue packages (`liquid-text-core.ts`, a byte-identical copy). Neither
	// ref is state: booting or dropping the engine must not re-run the effects
	// below. `simRunning` goes false when the sim is dropped mid-session
	// (reduced motion turned on, GPU context lost) while a context-lost engine
	// is kept until unmount, so destroy() still removes its canvas listeners.
	const engineRef = useRef<LiquidTextEngine | null>(null);
	const simRunningRef = useRef(false);
	// What the theme observer compares against; the state above is what the
	// fallback markup renders. Always written together.
	const themeColorRef = useRef(themeColor);

	// Every prop at its latest committed value, for the long-lived closures
	// (theme observer, resize observer) and the mount-only effect, which would
	// otherwise freeze the mount-time values.
	const live = useLiveRef({
		text,
		font,
		fontSize,
		fontWeight,
		lightColor,
		darkColor,
		strength,
		radius,
		forceGain,
		dissipation,
		viscosity,
		chromaticRatio,
		staticBelow,
		interactive,
		pauseWhenHidden,
	});

	const rootHeight = `${Math.round(displayFontSize * HEIGHT_RATIO)}px`;

	// Text/font/color changes re-derive the theme color, and the resolved font +
	// size: on the canvas path the engine re-measures and re-rasterizes (its
	// `onMetrics` mirrors the result back here); on the static path the
	// fallback is measured directly.
	//
	// A layout effect, not a passive one: the fitted font size drives the root
	// height and the fallback text's size, so running it after paint would show
	// one frame at the previous (or default 64px) size on every text/font
	// change. The Svelte `$effect` this mirrors flushes before the browser
	// paints.
	useIsomorphicLayoutEffect(() => {
		const root = rootRef.current;
		if (!root) return;
		const nextColor = activeThemeColor(lightColor, darkColor);
		themeColorRef.current = nextColor;
		setThemeColor(nextColor);
		const engine = engineRef.current;
		if (simRunningRef.current && engine) {
			engine.setOptions({ text, font, fontSize, fontWeight, textColor: nextColor });
		} else {
			const metrics = measureLiquidText(root, { text, font, fontSize, fontWeight });
			setResolvedFont(metrics.font);
			if (metrics.fontSize !== null) setDisplayFontSize(metrics.fontSize);
		}
	}, [text, font, fontSize, fontWeight, lightColor, darkColor]);

	// Sim parameters: pushed through without touching the text texture. On
	// mount this repeats the values the engine just started with.
	useEffect(() => {
		engineRef.current?.setOptions({
			strength,
			radius,
			forceGain,
			dissipation,
			viscosity,
			chromaticRatio,
			interactive,
			pauseWhenHidden,
		});
	}, [
		strength,
		radius,
		forceGain,
		dissipation,
		viscosity,
		chromaticRatio,
		interactive,
		pauseWhenHidden,
	]);

	// Mount-only. `staticBelow` and the reduced-motion preference are read once,
	// like the Svelte `onMount`: crossing the breakpoint later does not
	// retroactively swap modes.
	//
	// A layout effect, not a passive one: both of the paint-visible decisions
	// this makes — the auto-fitted font size (which sets the root height) and
	// the static -> canvas promotion — would otherwise land one painted frame
	// late, so the default `fontSize={0}` path would flash 64px text before
	// jumping to its fitted size. The Svelte `onMount` this mirrors flushes
	// before the first paint.
	useIsomorphicLayoutEffect(() => {
		const root = rootRef.current;
		const canvas = canvasRef.current;
		if (!root || !canvas) return;

		function fitFallback() {
			if (!root) return;
			const metrics = measureLiquidText(root, live.current);
			setResolvedFont(metrics.font);
			if (metrics.fontSize !== null) setDisplayFontSize(metrics.fontSize);
		}

		const initialColor = activeThemeColor(live.current.lightColor, live.current.darkColor);
		themeColorRef.current = initialColor;
		setThemeColor(initialColor);

		const themeObserver = new MutationObserver(() => {
			const next = activeThemeColor(live.current.lightColor, live.current.darkColor);
			if (next !== themeColorRef.current) {
				themeColorRef.current = next;
				setThemeColor(next);
				engineRef.current?.setOptions({ textColor: next });
			}
		});
		themeObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class"],
		});

		fitFallback();

		// The live media state, not only the hook's answer: on a hydrated page
		// the hook still reports its server value (`false`) here.
		const reduce = window.matchMedia(REDUCED_MOTION_QUERY).matches;
		const tooSmall = window.innerWidth <= live.current.staticBelow;

		let engine: LiquidTextEngine | null = null;
		if (!reduce && !tooSmall) {
			const props = live.current;
			engine = createLiquidText(
				{ host: root, canvas },
				{
					text: props.text,
					font: props.font,
					fontSize: props.fontSize,
					fontWeight: props.fontWeight,
					textColor: initialColor,
					strength: props.strength,
					radius: props.radius,
					forceGain: props.forceGain,
					dissipation: props.dissipation,
					viscosity: props.viscosity,
					chromaticRatio: props.chromaticRatio,
					interactive: props.interactive,
					pauseWhenHidden: props.pauseWhenHidden,
					onMetrics: (metrics) => {
						setResolvedFont(metrics.font);
						setDisplayFontSize(metrics.fontSize);
					},
					// A real GPU context loss leaves every GL object invalid, so the
					// engine tears itself down and we drop to the stable static
					// fallback for the rest of this mount.
					onContextLost: () => {
						simRunningRef.current = false;
						setMode("static");
					},
					// React re-runs this effect setup -> cleanup -> setup on the SAME
					// <canvas> (StrictMode in development, and Fast Refresh), and a
					// context dropped through WEBGL_lose_context is never handed out
					// again: the second start would get a dead context. The engine
					// still deletes every GL object it allocated; only the context
					// itself is kept, and reclaimed with the canvas. A failed start
					// still drops it.
					releaseContext: false,
				}
			);
		}
		engineRef.current = engine;
		simRunningRef.current = engine !== null;
		// Set either way: a re-run of this effect (StrictMode, Fast Refresh) whose
		// start fails after an earlier pass already promoted to "canvas" must not
		// strand an empty canvas with only the sr-only span. A no-op on a first
		// mount that stays static.
		setMode(engine ? "canvas" : "static");

		// One observer for both paths: it drives the sim's resize while the
		// canvas is live, and the auto-fit (fontSize=0) fallback text otherwise
		// — so the fallback never stays frozen at its mount-time size across a
		// later container/viewport resize (e.g. mobile rotation), including
		// after the sim was dropped mid-session.
		const resizeObserver = new ResizeObserver(() => {
			const current = engineRef.current;
			if (simRunningRef.current && current) current.resize();
			else fitFallback();
		});
		resizeObserver.observe(root);

		return () => {
			themeObserver.disconnect();
			resizeObserver.disconnect();
			// The ref, not the local: a reduced-motion drop has already destroyed
			// and cleared it.
			engineRef.current?.destroy();
			engineRef.current = null;
			simRunningRef.current = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Honor a live toggle of the OS reduced-motion setting, not just its value
	// at mount: if it turns on while the sim is running, tear the sim down and
	// drop to the static fallback. Turning it back off does not restart it.
	useIsomorphicLayoutEffect(() => {
		if (!reducedMotion || !simRunningRef.current) return;
		engineRef.current?.destroy();
		engineRef.current = null;
		simRunningRef.current = false;
		setMode("static");
	}, [reducedMotion]);

	return (
		<div
			ref={rootRef}
			className={cn("liquid-text relative block w-full", className)}
			style={{ height: rootHeight }}
		>
			<canvas
				ref={canvasRef}
				aria-hidden="true"
				className={cn(
					"pointer-events-none absolute inset-0 block h-full w-full",
					mode === "canvas" ? "" : "invisible"
				)}
			/>
			{mode === "canvas" ? (
				<span className="sr-only">{text}</span>
			) : (
				<span
					className="liquid-text-fallback block"
					style={{
						color: themeColor,
						// An empty family must not reach the style object: React 18's
						// hydration comparator renders it as `font-family:` and reports a
						// mismatch against the server markup that omitted it.
						fontFamily: resolvedFont || undefined,
						fontSize: `${displayFontSize}px`,
						fontWeight,
					}}
				>
					{text}
				</span>
			)}
		</div>
	);
}

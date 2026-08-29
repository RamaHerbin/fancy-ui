import {
	forwardRef,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type CSSProperties,
	type HTMLAttributes,
	type ReactNode,
	type TransitionEvent as ReactTransitionEvent,
} from "react";
import { cn } from "../../utils.js";
import {
	LAYER_PRESETS,
	buildLayerBackgrounds,
	buildOscillators,
	motionPreset,
	type PulseBeamPalette,
	type PulseBeamTone,
	type PulseBeamVariant,
} from "./pulse-beam-data.js";
import { registerPulse } from "./pulse-beam-loop.js";
import "./pulse-beam.css";

export type { PulseBeamPalette, PulseBeamTone, PulseBeamVariant };

/**
 * PulseBeam — a breathing, colour-shifting border glow.
 *
 * Wrap any card or control. Three masked gradient layers (a 1px ring, a
 * feathered inner glow and a blurred bloom) are driven by a shared
 * animation loop through CSS custom properties, so the effect stays on the
 * compositor and costs one style recalc per frame per instance.
 */
export interface PulseBeamProps extends HTMLAttributes<HTMLDivElement> {
	/** Additional classes on the wrapper */
	className?: string;
	/** Content the glow wraps — give it an opaque background and the same radius */
	children?: ReactNode;
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

const FADE_IN_MS = 600;
const FADE_OUT_MS = 500;
/** Slack after the CSS duration before the JS fallback settles the fade. */
const FADE_SLACK_MS = 80;

type Phase = "idle" | "active" | "fading";

export const PulseBeam = forwardRef<HTMLDivElement, PulseBeamProps>(function PulseBeam(
	{
		className,
		children,
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
		style,
		...restProps
	},
	forwardedRef
) {
	// Starts idle even when `active` is true so the first activation is a real
	// fade-in, and SSR output never flashes a fully lit ring before hydration.
	const [phase, setPhaseState] = useState<Phase>("idle");
	const [reducedMotion, setReducedMotion] = useState(false);

	// Refs mirrored for timers and event handlers: they must read the latest
	// value without re-arming the fade effect (the Svelte side untracks them).
	const phaseRef = useRef<Phase>("idle");
	const reducedMotionRef = useRef(false);
	const pendingRef = useRef<"in" | "out" | null>(null);
	const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const onfadeinRef = useRef(onfadein);
	onfadeinRef.current = onfadein;
	const onfadeoutRef = useRef(onfadeout);
	onfadeoutRef.current = onfadeout;

	const hostRef = useRef<HTMLDivElement | null>(null);
	const setHostRef = useCallback(
		(node: HTMLDivElement | null) => {
			hostRef.current = node;
			if (typeof forwardedRef === "function") forwardedRef(node);
			else if (forwardedRef) (forwardedRef as { current: HTMLDivElement | null }).current = node;
		},
		[forwardedRef]
	);

	const setPhase = (next: Phase) => {
		phaseRef.current = next;
		setPhaseState(next);
	};

	// --- derived configuration -------------------------------------------------

	const preset = LAYER_PRESETS[variant][tone];
	const isMono = palette === "mono" && !colors?.length;
	const monoFactor = isMono ? 0.5 : 1;
	// Memoised: the oscillator set keys the loop effect, so its identity may only
	// change when the motion configuration actually does.
	const motion = useMemo(() => motionPreset(variant, tone, speed), [variant, tone, speed]);
	const oscillators = useMemo(() => buildOscillators(motion), [motion]);
	const hueEnabled = hueShift && !isMono;
	const backgrounds = buildLayerBackgrounds({ variant, palette, colors, tone, op: motion.op });
	const clampedStrength = Math.min(1, Math.max(0, Number.isFinite(strength) ? strength : 1));
	const running = phase !== "idle";

	// --- reduced motion ----------------------------------------------------------

	// Declared FIRST: the ref must be set before the fade effect's first run,
	// matching the Svelte onMount-before-$effect ordering.
	useEffect(() => {
		if (typeof window.matchMedia !== "function") return;
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		reducedMotionRef.current = mq.matches;
		setReducedMotion(mq.matches);
		const handler = (e: MediaQueryListEvent) => {
			reducedMotionRef.current = e.matches;
			setReducedMotion(e.matches);
		};
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, []);

	// --- fade state machine ------------------------------------------------------

	const settle = (kind: "in" | "out") => {
		if (pendingRef.current !== kind) return;
		pendingRef.current = null;
		clearTimeout(fadeTimerRef.current);
		if (kind === "out") {
			setPhase("idle");
			onfadeoutRef.current?.();
		} else {
			onfadeinRef.current?.();
		}
	};

	const handleTransitionEnd = (e: ReactTransitionEvent<HTMLDivElement>) => {
		if (e.propertyName !== "opacity" || e.target !== e.currentTarget) return;
		settle(phaseRef.current === "fading" ? "out" : "in");
	};

	useEffect(() => {
		const on = active;
		const host = hostRef.current;
		clearTimeout(fadeTimerRef.current);
		if (on) {
			// Already active: no new fade to start, but a fade still pending from an
			// earlier run needs its fallback back (the cleanup above just cleared it).
			if (phaseRef.current !== "active") {
				// Force the idle style to be computed so the flip to active is a
				// transition rather than a first paint.
				if (phaseRef.current === "idle" && host) void host.offsetWidth;
				setPhase("active");
				pendingRef.current = "in";
			}
		} else {
			if (phaseRef.current === "idle") {
				pendingRef.current = null;
				return;
			}
			setPhase("fading");
			pendingRef.current = "out";
		}
		// Nothing left to settle — the fade already completed.
		if (pendingRef.current === null) return;
		// Fallback for the cases where no transitionend arrives: reduced
		// motion, a display:none ancestor, an offscreen host, jsdom.
		// Re-armed on EVERY run, so StrictMode's body → cleanup → body double
		// invoke cannot leave a pending fade without its fallback timer.
		const ms = reducedMotionRef.current ? 0 : (on ? FADE_IN_MS : FADE_OUT_MS) + FADE_SLACK_MS;
		fadeTimerRef.current = setTimeout(() => settle(on ? "in" : "out"), ms);
		return () => clearTimeout(fadeTimerRef.current);
		// `settle` only touches refs; phase/reducedMotion are read untracked, as in the source.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [active]);

	// --- shared animation loop ----------------------------------------------------

	useEffect(() => {
		const host = hostRef.current;
		const hue = hueEnabled ? { period: motion.huePeriod } : null;
		if (!host) return;
		// Turning hue drift off must drop the rotation the loop last wrote, otherwise
		// the palette stays frozen at an arbitrary angle.
		if (!hue) host.style.removeProperty("--pb-hue");
		if (!running || reducedMotion) return;

		const handle = registerPulse(host, oscillators, hue);
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
	}, [running, reducedMotion, oscillators, hueEnabled, motion]);

	// --- outside variant: scale blobs with the box --------------------------------

	useEffect(() => {
		const host = hostRef.current;
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
	}, [variant]);

	// The host's `style` prop carries only the static configuration properties.
	// The loop writes the animated `--pb-*` properties imperatively; React only
	// removes style keys that were present in a previous `style` object, so those
	// writes survive re-renders — never add an animated property here.
	const hostStyle = {
		...style,
		"--pb-strength": clampedStrength,
		"--pb-radius": `${radius}px`,
		"--pb-o-stroke": preset.stroke * monoFactor,
		"--pb-o-glow": preset.glow * monoFactor,
		"--pb-o-bloom": preset.bloom * monoFactor,
		"--pb-brightness": brightness ?? preset.brightness,
		"--pb-saturation": saturation ?? preset.saturation,
		"--pb-glow-blur": `${preset.glowBlur}px`,
		"--pb-bloom-blur": `${preset.bloomBlur}px`,
	} as CSSProperties;

	return (
		<div
			ref={setHostRef}
			className={cn("pulse-beam", className)}
			style={hostStyle}
			{...restProps}
			data-variant={variant}
			data-state={phase}
		>
			{children}
			<div className="pulse-beam__layer pulse-beam__glow" style={{ background: backgrounds.glow }} />
			<div
				className="pulse-beam__layer pulse-beam__stroke"
				style={{ background: backgrounds.stroke }}
				onTransitionEnd={handleTransitionEnd}
			/>
			<div
				className="pulse-beam__layer pulse-beam__bloom"
				style={{ background: backgrounds.bloom }}
			/>
		</div>
	);
});

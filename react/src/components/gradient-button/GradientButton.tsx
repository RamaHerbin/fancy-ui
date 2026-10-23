import { forwardRef, useEffect, useState } from "react";
import type { ButtonHTMLAttributes, CSSProperties, MouseEvent, ReactNode } from "react";
import { cn } from "../../utils.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { attachHdrLight, watchHdrLight } from "../../internals/hdr/hdr-light.js";
import { conicBorderProbe } from "../../internals/hdr/hdr-probes.js";
import { useSoundCue } from "../../sound/use-sound.js";
import { useSoundFeedback } from "../../sound/sound-feedback.js";
import "./gradient-button.css";

type BaseProps = {
	/** Colours of the beam, spread along its arc */
	colors?: string[];
	/** Time for the beam to travel once around the button, in milliseconds */
	duration?: number;
	/** Width of the lit border in pixels */
	borderWidth?: number;
	/** Border radius in pixels */
	borderRadius?: number;
	/** Softness of the glow the beam casts inside the button, in pixels */
	blur?: number;
	/** Background color of the button face */
	bgColor?: string;
	/** Custom CSS class */
	className?: string;
	/** Button content */
	children?: ReactNode;
	/**
	 * Plays the `hover` cue on mouse/pen pointer enter and the `press` cue on
	 * click. Off by default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
	/**
	 * Beta, off by default. On a display that reports HDR, add the beam's light above SDR white on
	 * the border, in a WebGPU layer with extended tone mapping, following the
	 * CSS spin exactly. Elsewhere nothing changes.
	 */
	hdr?: boolean;
};

export interface GradientButtonProps
	extends BaseProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> {}

/**
 * The beam as a conic gradient: a main arc carrying every colour over ~40%
 * of the turn, and a fainter echo opposite it. Turned by `--gb-angle`.
 */
export function beamGradient(colors: string[]): string {
	const list = colors.length ? colors : ["#ffffff"];
	const arc = (from: number, to: number, strength: number) => {
		const span = to - from;
		const stops = list.map((c, i) => {
			const at = from + span * ((i + 1) / (list.length + 1));
			const color = strength < 100 ? `color-mix(in srgb, ${c} ${strength}%, transparent)` : c;
			return `${color} ${at.toFixed(1)}%`;
		});
		return [`transparent ${from}%`, ...stops, `transparent ${to}%`].join(", ");
	};
	return `conic-gradient(from var(--gb-angle), ${arc(0, 42, 100)}, ${arc(50, 78, 45)}, transparent 100%)`;
}

const DEFAULT_COLORS = ["#34d399", "#22d3ee", "#6366f1", "#d946ef", "#f43f5e", "#f59e0b"];

export const GradientButton = forwardRef<HTMLButtonElement, GradientButtonProps>(
	(
		{
			className,
			colors = DEFAULT_COLORS,
			duration = 3000,
			borderWidth = 1.5,
			borderRadius = 12,
			blur = 4,
			bgColor = "#161616",
			children,
			onClick,
			sound = false,
			hdr = false,
			...restProps
		},
		ref
	) => {
		const playCue = useSoundCue(sound);

		// Hover cue for mouse/pen pointers only. `on: {}` binds nothing when sound is
		// off (and never the default click → press, which `handleClick` already plays).
		const soundRef = useSoundFeedback({
			on: sound ? { pointerenter: "hover" } : {},
			disabled: restProps.disabled,
		});
		const [button, buttonRef] = useElementRef<HTMLButtonElement>();
		const [hdrCanvas, hdrCanvasRef] = useElementRef<HTMLCanvasElement>();
		// The canvas exists only where the light can run; SSR and SDR devices render none,
		// and it follows the window between SDR and HDR monitors.
		const [hdrCapable, setHdrCapable] = useState(false);
		useEffect(() => {
			return watchHdrLight(setHdrCapable);
		}, []);
		const composedRef = useComposedRefs<HTMLButtonElement>(ref, buttonRef, soundRef);
		const live = useLiveRef({ colors, borderRadius, borderWidth });

		// The HDR light reads the live, CSS-animated `--gb-angle`, so it turns with
		// the beam by construction: the main arc peaks mid-way, the echo is fainter.
		useEffect(() => {
			if (!button || !hdrCanvas) return;
			const pick = (t: number) => {
				const list = live.current.colors.length ? live.current.colors : ["#ffffff"];
				return list[Math.min(list.length - 1, Math.floor(t * list.length))]!;
			};
			return attachHdrLight({
				host: button,
				canvas: hdrCanvas,
				pad: 0,
				probe: conicBorderProbe({
					angleFrom: button,
					angleVar: "--gb-angle",
					radius: () => live.current.borderRadius,
					inset: () => live.current.borderWidth / 2,
					level: () => (button.matches(":disabled") ? 0 : 1),
					arcs: () => [
						{ from: 0, to: 42, color: pick, intensity: (t) => 2.8 * Math.sin(Math.PI * t) },
						{ from: 50, to: 78, color: pick, intensity: (t) => 1 * Math.sin(Math.PI * t) },
					],
				}),
			});
		}, [button, hdrCanvas, live]);

		function handleClick(event: MouseEvent<HTMLButtonElement>) {
			if (!restProps.disabled) playCue("press");
			onClick?.(event);
		}

		const styleVars = {
			"--gb-colors": colors.join(", "),
			"--gb-beam": beamGradient(colors),
			"--gb-duration": `${duration}ms`,
			"--gb-border-width": `${borderWidth}px`,
			"--gb-border-radius": `${borderRadius}px`,
			"--gb-blur": `${blur}px`,
			"--gb-bg-color": bgColor,
		} as CSSProperties;

		return (
			<button
				ref={composedRef}
				className={cn(
					"gradient-button relative flex min-h-10 min-w-28 cursor-pointer items-center justify-center overflow-hidden text-white",
					className
				)}
				style={styleVars}
				onClick={handleClick}
				{...restProps}
			>
				{/* Face and label */}
				<span className="gradient-content inline-flex size-full items-center justify-center px-5 py-2.5">
					{children}
				</span>

				{/* The glow the beam casts inside the face */}
				<span className="gradient-glow" aria-hidden="true">
					<span></span>
				</span>

				{/* The beam on the border */}
				<span className="gradient-border" aria-hidden="true" />

				{hdr && hdrCapable ? (
					<canvas ref={hdrCanvasRef} className="gradient-hdr" aria-hidden="true" />
				) : null}
			</button>
		);
	}
);

GradientButton.displayName = "GradientButton";

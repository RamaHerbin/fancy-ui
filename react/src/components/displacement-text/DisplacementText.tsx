import { useEffect, useRef, useState } from "react";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { cn } from "../../utils.js";
import {
	DEFAULT_MAX_DPR,
	STATIC_LAYER_STYLE,
	mountDisplacementText,
	staticTextStyle,
	type DisplacementTextController,
	type DisplacementTextState,
} from "./displacement-text-core.js";

/**
 * DisplacementText - Large text rendered as a WebGL plane that bulges toward the
 * viewer near the cursor.
 *
 * The text is rasterized to a 2048x2048 canvas and uploaded as a texture; a
 * vertex shader offsets each vertex's `z` by its distance to a `uDisplacement`
 * uniform, which a raycast against an invisible hit-plane updates on every
 * `pointermove`. With reduced motion preferred, without WebGL, or after a lost
 * GPU context, the real text is shown instead, styled like the resting frame.
 */
export interface DisplacementTextProps {
	/** Text to display */
	text?: string;
	/** Font size in pixels */
	fontSize?: number;
	/** Font family */
	font?: string;
	/** Fixed text color (overrides theme colors) */
	color?: string;
	/** Text color in light mode */
	lightColor?: string;
	/** Text color in dark mode */
	darkColor?: string;
	/** Upper bound for the renderer's device pixel ratio */
	maxDpr?: number;
	/** Additional CSS classes */
	className?: string;
}

export function DisplacementText({
	text = "Hover Me",
	fontSize = 200,
	font = "Inter, sans-serif",
	color,
	lightColor = "#000000",
	darkColor = "#ffffff",
	maxDpr = DEFAULT_MAX_DPR,
	className = "",
}: DisplacementTextProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const controllerRef = useRef<DisplacementTextController | null>(null);
	const options = { text, fontSize, font, color, lightColor, darkColor, maxDpr };
	const mountOptions = useLiveRef(options);

	// Starts "static" so the server render (and the first client render) carry
	// the real text; the controller promotes to the canvas once motion is
	// allowed and WebGL is available, and drops back when reduced motion turns on.
	const [state, setState] = useState<DisplacementTextState>(() => ({
		mode: "static",
		color: color ?? lightColor,
	}));

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		const controller = mountDisplacementText(
			{ container },
			{ ...mountOptions.current, onChange: setState }
		);
		controllerRef.current = controller;
		return () => {
			controller.destroy();
			if (controllerRef.current === controller) controllerRef.current = null;
		};
	}, [mountOptions]);

	// Options are diffed by the engine: nothing here rebuilds the scene.
	useEffect(() => {
		controllerRef.current?.setOptions({
			text,
			fontSize,
			font,
			color,
			lightColor,
			darkColor,
			maxDpr,
		});
	}, [text, fontSize, font, color, lightColor, darkColor, maxDpr]);

	// The canvas is a decorative rendering of the text, so the container carries
	// it for assistive technology; the static fallback is the real string.
	return (
		<div
			ref={containerRef}
			role="img"
			aria-label={text}
			className={cn("relative h-[400px] w-full", className)}
		>
			{state.mode === "static" ? (
				<div style={STATIC_LAYER_STYLE}>
					<span style={staticTextStyle({ fontSize, font }, state.color)}>{text}</span>
				</div>
			) : null}
		</div>
	);
}

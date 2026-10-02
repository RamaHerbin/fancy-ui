import {
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
	type CSSProperties,
	type ReactNode,
} from "react";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { useReducedMotion } from "../../internals/motion/media-query.js";
import { cn } from "../../utils.js";
import {
	createSmoothCursor,
	type SmoothCursorEngine,
	type SpringConfig,
} from "./smooth-cursor-core.js";
import "./smooth-cursor.css";

export type { SpringConfig };

export interface SmoothCursorProps {
	/** Custom cursor node to replace the default arrow cursor */
	cursor?: ReactNode;
	/** Spring physics configuration */
	springConfig?: SpringConfig;
	/** Additional CSS classes */
	className?: string;
	/** Name shown in a pill that trails the arrow. No pill when omitted. */
	label?: string;
	/** Fill colour of the arrow and the name pill (any CSS colour) */
	color?: string;
	/** Rotate the cursor toward its direction of travel (the arrow stays upright when false) */
	rotate?: boolean;
	/** Milliseconds without movement before the name pill dims; 0 disables */
	idleFade?: number;
	/** Spring for the name pill; missing fields derive from `springConfig` (stiffness × 0.55, damping × 1.1) */
	labelSpring?: SpringConfig;
}

/** Arrow tip inside the 24×24 default arrow — the pointer's hotspot. */
const TIP_X = 4;
const TIP_Y = 3;

export function SmoothCursor({
	cursor,
	springConfig = {},
	className = "",
	label,
	color = "#0e9f6e",
	rotate = false,
	idleFade = 1500,
	labelSpring,
}: SmoothCursorProps) {
	// SSR-stable, and stripped to ASCII so the `url(#…)` paint reference never
	// has to carry the delimiters React puts in its ids.
	const uid = useId().replace(/[^A-Za-z0-9_-]/g, "");
	const fillId = `smooth-cursor-fill-${uid}`;

	const cursorElRef = useRef<HTMLDivElement | null>(null);
	const labelElRef = useRef<HTMLDivElement | null>(null);
	const engineRef = useRef<SmoothCursorEngine | null>(null);
	const [visible, setVisible] = useState(false);
	const [idle, setIdle] = useState(false);

	const reducedMotion = useReducedMotion();
	// The latest props, read once when the engine is created (the Svelte
	// source's `untrack` reads at mount).
	const initRef = useLiveRef({ springConfig, labelSpring, rotate, idleFade, reducedMotion });
	/** The reduced-motion value the engine currently holds. */
	const appliedReducedMotionRef = useRef(false);

	// The default arrow is pinned by its tip while upright; a custom cursor, or
	// any cursor that rotates with travel, is pinned by its centre (the pivot).
	const hotspot = !cursor && !rotate ? `-${TIP_X}px -${TIP_Y}px` : "-50% -50%";

	useEffect(() => {
		const init = initRef.current;
		// The mount-time reduced-motion value is a creation option (plain
		// assignment, no snap); only a later change goes through `setOptions`,
		// which stops the loop and snaps.
		appliedReducedMotionRef.current = init.reducedMotion;

		const engine = createSmoothCursor(
			{ cursor: cursorElRef.current!, label: labelElRef.current },
			{
				springConfig: init.springConfig,
				labelSpring: init.labelSpring,
				rotate: init.rotate,
				idleFade: init.idleFade,
				reducedMotion: init.reducedMotion,
				onVisibleChange: setVisible,
				onIdleChange: setIdle,
			}
		);
		engineRef.current = engine;

		return () => {
			engine.destroy();
			engineRef.current = null;
		};
	}, [initRef]);

	useEffect(() => {
		if (appliedReducedMotionRef.current === reducedMotion) return;
		appliedReducedMotionRef.current = reducedMotion;
		engineRef.current?.setOptions({ reducedMotion });
	}, [reducedMotion]);

	useEffect(() => {
		engineRef.current?.setOptions({ springConfig });
	}, [springConfig]);

	useEffect(() => {
		engineRef.current?.setOptions({ labelSpring });
	}, [labelSpring]);

	useEffect(() => {
		engineRef.current?.setOptions({ rotate });
	}, [rotate]);

	useEffect(() => {
		engineRef.current?.setOptions({ idleFade });
	}, [idleFade]);

	// The pill mounts and unmounts with `label`; hand the live node to the engine.
	const setLabelEl = useCallback((node: HTMLDivElement | null) => {
		labelElRef.current = node;
		engineRef.current?.setLabel(node);
	}, []);

	return (
		<div
			aria-hidden="true"
			className={cn(
				"smooth-cursor pointer-events-none fixed top-0 left-0 z-[9999]",
				visible ? "opacity-100" : "opacity-0",
				className
			)}
			style={{ "--_sc-color": `var(--smooth-cursor-color, ${color})` } as CSSProperties}
		>
			<div
				ref={cursorElRef}
				className={rotate ? "sc-pointer sc-pointer--rotate" : "sc-pointer"}
				style={{ translate: hotspot }}
			>
				{cursor ? (
					cursor
				) : (
					// Default cursor: coloured arrowhead with a white rim
					<svg
						className="sc-arrow"
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						focusable="false"
					>
						<defs>
							<linearGradient id={fillId} x1="0.1" y1="0" x2="0.75" y2="1">
								<stop offset="0" className="sc-stop-hot" />
								<stop offset="0.55" className="sc-stop-body" />
								<stop offset="1" className="sc-stop-deep" />
							</linearGradient>
						</defs>
						<path
							className="sc-arrow-rim"
							d="M4 3 L19.6 13.9 L10.2 12.7 L7.3 21.7 Z"
							fill={`url(#${fillId})`}
						/>
					</svg>
				)}
			</div>

			{label ? (
				<div
					ref={setLabelEl}
					className={idle ? "sc-label is-idle" : "sc-label"}
					data-smooth-cursor-label=""
				>
					<span className="sc-label-text">{label}</span>
				</div>
			) : null}
		</div>
	);
}

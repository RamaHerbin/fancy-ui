import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { observeInView } from "../../internals/motion/in-view.js";
import { useReducedMotion } from "../../internals/motion/media-query.js";
import {
	createMagneticFieldCore,
	createMagneticFieldHub,
	MAGNETIC_FIELD_DEFAULTS,
	resolveSpring,
} from "./magnetic-field-core.js";
import type {
	MagneticFieldCore,
	MagneticFieldOptions,
	MagneticFieldSource,
	MagneticPoint,
	MagneticSpring,
	MagneticSpringPreset,
} from "./magnetic-field-core.js";
import { attachLayoutInvalidation, attachPointerSource } from "./magnetic-field-source.js";
import { MAGNETIC_FIELD_KEY } from "./types.js";
import type { MagneticFieldContext } from "./types.js";
import "./magnetic-field.css";

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
	children?: ReactNode;
	/** Additional CSS classes. */
	className?: string;
}

/** Native `<div>` attributes and listeners are forwarded to the root. */
export interface MagneticFieldProps
	extends
		MagneticFieldOwnProps,
		Omit<HTMLAttributes<HTMLDivElement>, keyof MagneticFieldOwnProps> {}

export const MagneticField = forwardRef<HTMLDivElement, MagneticFieldProps>(function MagneticField(
	{
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
		className,
		...rest
	},
	forwardedRef
) {
	const [node, nodeRef] = useElementRef<HTMLDivElement>();
	const composedRef = useComposedRefs(forwardedRef, nodeRef);

	// One hub for the field's whole life: items and pucks register through it
	// whether or not the core exists yet (their effects run before this
	// component's), and it replays them into each core. Created once, so the
	// context value never changes and no item ever re-registers because the
	// field re-rendered; a development double-mount reuses the same buffer.
	const [hub] = useState(createMagneticFieldHub);
	const context: MagneticFieldContext = hub;

	const reduced = useReducedMotion();

	const [core, setCore] = useState<MagneticFieldCore | null>(null);
	const [active, setActive] = useState(false);

	const onActiveChangeRef = useLiveRef(onActiveChange);
	const handleActive = useCallback(
		(next: boolean) => {
			setActive(next);
			onActiveChangeRef.current?.(next);
		},
		[onActiveChangeRef]
	);

	// The spring is resolved to plain numbers so an inline `{ stiffness }`
	// literal, a new object every render, does not re-run the update effect.
	const resolved = resolveSpring(spring);
	const { stiffness, damping, mass } = resolved;

	const options: Partial<MagneticFieldOptions> = {
		radius,
		strength,
		maxTranslate,
		maxRotate,
		spring: resolved,
		polarity,
		reducedMotion: reduced,
		disabled,
		onActiveChange: handleActive,
	};
	const optionsRef = useLiveRef(options);

	// The core lives exactly as long as the root node.
	useEffect(() => {
		if (!node) return;
		const next = createMagneticFieldCore(node, optionsRef.current);
		setCore(next);
		hub.attach(next);
		return () => {
			hub.detach();
			next.destroy();
			setCore(null);
			setActive(false);
		};
	}, [node, hub, optionsRef]);

	// Every prop change goes through one update; the core ignores no-ops.
	useEffect(() => {
		core?.update({
			radius,
			strength,
			maxTranslate,
			maxRotate,
			spring: { stiffness, damping, mass },
			polarity,
			reducedMotion: reduced,
			disabled,
			onActiveChange: handleActive,
		});
	}, [
		core,
		radius,
		strength,
		maxTranslate,
		maxRotate,
		stiffness,
		damping,
		mass,
		polarity,
		reduced,
		disabled,
		handleActive,
	]);

	// Listeners exist only while something can move: the field is enabled,
	// motion is allowed, and the field (inflated by `radius`) is on screen.
	const onVisibleRef = useRef<((visible: boolean) => void) | null>(null);
	useEffect(() => {
		if (!core || !node) return;
		const c = core;
		const usePointer = source === "pointer";
		if (disabled || reduced || !usePointer) c.clearSource("pointer");
		if (disabled || reduced) return;

		let detachPointer: (() => void) | null = null;
		let detachLayout: (() => void) | null = null;

		onVisibleRef.current = (visible) => {
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
			onVisibleRef.current = null;
			detachPointer?.();
			detachLayout?.();
			c.clearSource("pointer");
		};
	}, [core, node, source, disabled, reduced]);

	// The in-view observer alone depends on `radius`: a new margin replaces it
	// without detaching the pointer, so a resting pointer keeps pulling.
	useEffect(() => {
		const onVisible = onVisibleRef.current;
		if (!node || !onVisible) return;
		const io = observeInView(node, {
			once: false,
			threshold: 0,
			rootMargin: `${radius}px`,
			onChange: onVisible,
		});
		return () => io.destroy();
	}, [core, node, source, disabled, reduced, radius]);

	// The controlled magnet. Written through the hub so it survives a core swap.
	const manualX = source === "manual" && position ? position.x : null;
	const manualY = source === "manual" && position ? position.y : null;
	useEffect(() => {
		hub.setSource(
			manualX === null || manualY === null ? null : { x: manualX, y: manualY },
			"manual"
		);
	}, [hub, manualX, manualY]);

	return (
		<MAGNETIC_FIELD_KEY.Provider value={context}>
			<div
				ref={composedRef}
				className={cn("ft-magnetic-field", className)}
				{...rest}
				data-source={source}
				data-active={active || undefined}
			>
				{children}
			</div>
		</MAGNETIC_FIELD_KEY.Provider>
	);
});

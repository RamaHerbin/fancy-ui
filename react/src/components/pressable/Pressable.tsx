import { forwardRef, useEffect, useRef, useState } from "react";
import type {
	CSSProperties,
	HTMLAttributes,
	KeyboardEvent,
	PointerEvent,
	ReactNode,
} from "react";
import { cn } from "../../utils.js";
import { canVibrate, vibrate } from "../../internals/motion/haptics.js";
import type { HapticPattern } from "../../internals/motion/types.js";
import "./pressable.css";

/**
 * Props for Pressable.
 *
 * Pressable wraps exactly one interactive child (a `<button>`, an `<a>`,
 * or anything that already owns its own role and keyboard handling) and
 * gives it a consistent, cross-browser press animation. It supersedes a
 * hand-rolled `:active` style — see the README before pairing the two.
 */
export interface PressableProps
	extends Omit<
		HTMLAttributes<HTMLDivElement>,
		| "onPointerDown"
		| "onPointerUp"
		| "onPointerCancel"
		| "onPointerLeave"
		| "onBlur"
		| "onKeyDown"
		| "onKeyUp"
	> {
	/** Additional CSS classes. */
	className?: string;
	/** How far the wrapper shrinks while pressed, as a CSS `scale()` factor. */
	scale?: number;
	/**
	 * Touch-only haptic pattern fired on `pointerdown`. `false` (the
	 * default) never vibrates — this is an opt-in, additive effect, never
	 * a required one.
	 */
	haptic?: false | HapticPattern;
	/** Suppresses every listener; the wrapper never sets `data-pressed`. */
	disabled?: boolean;
	/** Exactly one interactive child. Not enforced at runtime — documented only. */
	children: ReactNode;
}

const DEFAULT_SCALE = 0.97;

function isActivationKey(key: string): boolean {
	return key === " " || key === "Enter";
}

export const Pressable = forwardRef<HTMLDivElement, PressableProps>(
	(
		{
			scale = DEFAULT_SCALE,
			haptic = false,
			disabled = false,
			children,
			className,
			style,
			...restProps
		},
		ref
	) => {
		const rootRef = useRef<HTMLDivElement | null>(null);

		// Plain state, not a media-query-gated one: the press *state* always
		// tracks pointer/keyboard activity regardless of `prefers-reduced-motion`.
		// Only the CSS transition that animates `[data-pressed]` is gated (see
		// pressable.css) — reduced motion swaps a moving scale for a static
		// opacity change, it never turns press tracking off.
		const [pressed, setPressed] = useState(false);

		// The keydown branch (not the keyup one — see below) only arms on a key
		// that actually landed inside this wrapper's own subtree. Because the
		// listener itself lives on `.ft-pressable` and DOM events only reach a
		// listener via the bubble phase, `event.target` is already guaranteed to
		// be the root or one of its descendants for every event that gets here —
		// this check is a second, explicit guarantee of that fact (and the thing
		// the "target outside the wrapper" test asserts against), not a
		// document-level listener that needs it to survive.
		function isInsideRoot(target: EventTarget | null): boolean {
			const root = rootRef.current;
			return !!root && target instanceof Node && root.contains(target);
		}

		function press() {
			if (!disabled) setPressed(true);
		}

		function release() {
			setPressed(false);
		}

		// `disabled` can flip true mid-press (a "Save" handler disabling its own
		// button on submit), and the control that just went disabled is not
		// guaranteed to deliver the pointerup/focusout that would normally
		// release: Firefox sends no pointerup to a control disabled under the
		// pointer, and a click that never focused the button (macOS Safari) sends
		// no focusout either. The CSS `:not([data-disabled])` guard only HIDES the
		// pressed styling for as long as `disabled` stays true — clearing the
		// state here is what keeps a later re-enable (an async save resolving)
		// from revealing a stale `data-pressed` that no live press is behind.
		useEffect(() => {
			if (disabled) setPressed(false);
		}, [disabled]);

		function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
			if (disabled) return;
			// Mirrors the drawer precedent elsewhere in this collection: a
			// non-primary mouse button (right-click, middle-click) is not "a
			// press". Touch and pen contacts always report `button === 0`, so
			// this only ever filters the mouse case.
			if (event.pointerType === "mouse" && event.button !== 0) return;
			press();
			// Fired inside the same gesture that set `data-pressed`, never
			// deferred — `navigator.vibrate` requires an active user-activation
			// context. Touch only: a stylus press is not a "tap" in the sense a
			// haptic buzz confirms, and most styli have no motor of their own to
			// conflate with the device's.
			if (haptic && event.pointerType === "touch" && canVibrate()) vibrate(haptic);
		}

		function handlePointerRelease() {
			release();
		}

		// React's `onBlur` is attached to the native, bubbling `focusout` event
		// — this is the same listener the Svelte source registers as
		// `onfocusout`.
		function handleFocusOut() {
			release();
		}

		function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
			// OS key-repeat fires `keydown` continuously while a key stays held;
			// without this guard a held Enter/Space would keep "re-pressing" at
			// repeat rate, retriggering the haptic-free but still-pointless
			// animation restart on every tick.
			if (disabled || event.repeat) return;
			if (!isActivationKey(event.key)) return;
			if (!isInsideRoot(event.target)) return;
			press();
		}

		function handleKeyUp(event: KeyboardEvent<HTMLDivElement>) {
			if (event.repeat) return;
			if (!isActivationKey(event.key)) return;
			release();
		}

		const mergedStyle =
			scale === DEFAULT_SCALE
				? style
				: ({ ...style, "--ft-pressable-scale": scale } as CSSProperties);

		return (
			<div
				ref={(node) => {
					rootRef.current = node;
					if (typeof ref === "function") ref(node);
					else if (ref) ref.current = node;
				}}
				className={cn("ft-pressable", className)}
				{...restProps}
				style={mergedStyle}
				data-pressed={pressed ? "true" : undefined}
				data-disabled={disabled ? "true" : undefined}
				onPointerDown={handlePointerDown}
				onPointerUp={handlePointerRelease}
				onPointerCancel={handlePointerRelease}
				onPointerLeave={handlePointerRelease}
				onBlur={handleFocusOut}
				onKeyDown={handleKeyDown}
				onKeyUp={handleKeyUp}
			>
				{children}
			</div>
		);
	}
);

Pressable.displayName = "Pressable";

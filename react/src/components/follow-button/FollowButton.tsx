import {
	forwardRef,
	useCallback,
	useEffect,
	useRef,
	useState,
	type ButtonHTMLAttributes,
	type CSSProperties,
	type MouseEvent,
	type ReactNode,
} from "react";
import { cn } from "../../utils.js";
import { useIsomorphicLayoutEffect } from "../../internals/dom/ssr.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { sound as soundFx } from "../../sound/sound.js";
import { prefersReducedMotion } from "../../internals/motion/anchored.js";
import { Button, type ButtonProps } from "../button/Button.js";
import type { ButtonVariant, ButtonSize } from "../button/types.js";
import { StatusMorph } from "../status-morph/StatusMorph.js";
import {
	adopt,
	announcement,
	cancel,
	clearError,
	createFollowState,
	isThenable,
	morphState,
	press,
	resolveLabels,
	settle,
	shownFollowing,
	visibleLabel,
	type FollowLabels,
	type FollowState,
} from "./follow-core.js";
import "./follow-button.css";

export type { FollowLabels };

export interface FollowButtonProps extends Omit<
	ButtonHTMLAttributes<HTMLButtonElement>,
	"onClick" | "onToggle" | "className" | "type" | "children" | "disabled"
> {
	/**
	 * Whether the viewer follows. Controlled in the same way as the other
	 * stateful controls: the component keeps its own copy and re-syncs it when
	 * this prop CHANGES. A change while an attempt is pending wins and drops it.
	 */
	following?: boolean;
	/** Initial value when `following` is not passed */
	defaultFollowing?: boolean;
	/** Called with the committed value, once per successful attempt. Not called for a rolled-back or superseded one. */
	onFollowingChange?: (following: boolean) => void;
	/**
	 * Called with the value the click asks for. Return nothing to commit at
	 * once, or a promise: resolve commits, reject (or throw) rolls back, shows
	 * the error and announces it. Clicking again after a failure retries.
	 */
	onToggle?: (next: boolean) => void | Promise<unknown>;
	/** Stable accessible name, e.g. "Follow Rama". Defaults to the idle label. */
	label?: string;
	/** Visible text per state; unset keys keep the defaults. */
	labels?: Partial<FollowLabels>;
	/** Visible text and announcement after a failed attempt */
	errorLabel?: string;
	/** How long the error state holds before reverting, in milliseconds */
	resetMs?: number;
	/** Button variant. By default the idle state is `primary` and the following state `outline`. */
	variant?: ButtonVariant;
	/** Passed straight through to the underlying Button */
	size?: ButtonSize;
	/** Disables the button and blocks the toggle */
	disabled?: boolean;
	/** Drops the visible text, keeping the accessible name */
	iconOnly?: boolean;
	/**
	 * Plays the matching interface cue (toggle-on, toggle-off, error) and the
	 * error vibration. Off by default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
	/** Fires on activation, after the toggle has started. Never called while `disabled` or pending. */
	onClick?: (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
	/** Additional CSS classes */
	className?: string;
}

/** How long the outgoing label stays on screen, in milliseconds. */
const LEAVE_MS = 80;

/**
 * The inline `style` rides StatusMorph's rest props and lands as an attribute,
 * which beats its own width rule. `font-size` is set beside it so StatusMorph's
 * inner `calc(1em + 1px)` resolves to the same `1rem` and the glyph fills the
 * 16px box. `--ft-statusmorph-error` reads the same `--ft-status-error` chain
 * the failure skin in `follow-button.css` resolves, so a theme that declares
 * neither token still paints one red on the cross and the border.
 */
const MORPH_STYLE = {
	width: "1rem",
	height: "1rem",
	fontSize: "calc(1rem - 1px)",
	"--ft-statusmorph-error":
		"var(--ft-status-error, light-dark(oklch(0.577 0.245 27.325), oklch(0.704 0.191 22.216)))",
} as CSSProperties;

function glyph(shown: boolean): ReactNode {
	return (
		<svg
			className="size-full"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			{shown ? <path d="M20 6 9 17l-5-5" /> : <path d="M12 5v14M5 12h14" />}
		</svg>
	);
}

export const FollowButton = forwardRef<HTMLButtonElement | HTMLAnchorElement, FollowButtonProps>(
	function FollowButton(
		{
			following: followingProp,
			defaultFollowing = false,
			onFollowingChange,
			onToggle,
			label,
			labels,
			errorLabel = "Try again",
			resetMs = 2000,
			variant,
			size = "md",
			disabled = false,
			iconOnly = false,
			sound = false,
			className,
			onClick,
			...restProps
		},
		ref
	) {
		// The machine's snapshot, plus a ref mirror for the async callbacks: a
		// promise that settles later must read the CURRENT snapshot, not the one
		// its click closed over.
		const [core, setCore] = useState<FollowState>(() =>
			createFollowState(followingProp ?? defaultFollowing)
		);
		const coreRef = useRef(core);
		useIsomorphicLayoutEffect(() => {
			coreRef.current = core;
		}, [core]);

		const commit = useCallback((next: FollowState) => {
			coreRef.current = next;
			setCore(next);
		}, []);

		// The parent speaks: its value wins over a pending attempt or a standing
		// error. Derived during render (the documented "adjust state on prop
		// change" pattern) so no frame paints the stale value, and keyed on the
		// prop CHANGING, the same shape Toggle and Slider use.
		const [seenProp, setSeenProp] = useState(followingProp);
		if (followingProp !== seenProp) {
			setSeenProp(followingProp);
			if (followingProp !== undefined && followingProp !== core.following) {
				setCore(adopt(core, followingProp));
			}
		}

		// Anything still in flight at unmount is stale from here on.
		useEffect(
			() => () => {
				coreRef.current = cancel(coreRef.current);
			},
			[]
		);

		const live = useLiveRef({ onToggle, onFollowingChange, onClick, sound });

		const resolvedLabels = resolveLabels(labels);
		const shown = shownFollowing(core);
		const currentLabel = visibleLabel(core, resolvedLabels, errorLabel);
		// The accessible name never follows the visible text: a name that changes
		// next to `aria-pressed` would announce the state twice.
		const name = label ?? restProps["aria-label"] ?? resolvedLabels.follow;
		const showsPreview = core.phase === "idle" && core.following;
		const failed = core.phase === "error";

		const classes = cn("ft-follow", failed && "ft-follow--failed border", className);

		// The error window. Armed per failure and keyed on the ticket, so a retry
		// or a parent write that lands first is never cleared by a stale timer. 0
		// means "revert on the next tick", the reading the copy button gives it.
		useEffect(() => {
			if (core.phase !== "error") return;
			const armed = core.ticket;
			const timer = setTimeout(
				() => {
					commit(clearError(coreRef.current, armed));
				},
				resetMs > 0 ? resetMs : 1
			);
			return () => clearTimeout(timer);
		}, [core.phase, core.ticket, resetMs, commit]);

		function finish(ticket: number, ok: boolean) {
			const result = settle(coreRef.current, ticket, ok);
			// Superseded by the parent, a retry or an unmount: it has nothing to say.
			if (result.outcome === "stale") return;
			commit(result.state);
			const handlers = live.current;
			if (ok) {
				if (handlers.sound) soundFx.play(result.state.following ? "toggle-on" : "toggle-off");
				handlers.onFollowingChange?.(result.state.following);
			} else if (handlers.sound) {
				soundFx.play("error");
			}
		}

		function handleClick(event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) {
			// A click while an attempt is in flight is swallowed: neither the toggle
			// nor the consumer's own handler runs, and nothing is queued.
			const started = press(coreRef.current);
			if (!started) return;
			// The outcome cue may play after an await, when the transient activation
			// is gone: create/resume the audio context while the gesture is live.
			if (sound && soundFx.enabled) void soundFx.unlock();
			commit(started.state);
			const ticket = started.ticket;
			let result: unknown;
			let threw = false;
			try {
				result = live.current.onToggle?.(started.next);
			} catch {
				threw = true;
			}
			if (threw) finish(ticket, false);
			else if (isThenable(result)) {
				result.then(
					() => finish(ticket, true),
					() => finish(ticket, false)
				);
			} else finish(ticket, true);
			onClick?.(event);
		}

		// Out 80 ms, in 160 ms: a label change keeps the OUTGOING text alive for
		// the out beat as a second, `aria-hidden` layer in the same grid cell,
		// while the keyed live span fades in after that beat. Derived during render
		// so the outgoing text is in the very commit that shows the new one.
		// `prefersReducedMotion()` is read once per swap: under reduced motion
		// there is no outgoing layer and the text snaps.
		const [swap, setSwap] = useState<{
			shown: string;
			leaving: string | null;
			swapped: boolean;
		}>({ shown: currentLabel, leaving: null, swapped: false });
		if (swap.shown !== currentLabel) {
			setSwap({
				shown: currentLabel,
				// A second swap inside the out beat: `swap.shown` was still in its
				// delayed fade-in and never painted, so keep the layer that is on
				// screen (and its timer) rather than replacing it with unseen text.
				leaving: swap.leaving !== null ? swap.leaving : prefersReducedMotion() ? null : swap.shown,
				swapped: true,
			});
		}
		useEffect(() => {
			if (swap.leaving === null) return;
			const timer = setTimeout(() => {
				setSwap((current) => ({ ...current, leaving: null }));
			}, LEAVE_MS);
			return () => clearTimeout(timer);
		}, [swap.leaving]);

		/*
		 * The glyph is driven, not bound: `state` comes from the machine, so the
		 * morph has no timer of its own (`resetAfter={0}`) and cannot disagree with
		 * the button about whether an attempt is pending. Its `role="status"`
		 * region, which it portals to `document.body` and so never joins the
		 * button's name, is the one live region: silent while loading, assertive on
		 * error, "name: outcome".
		 */
		const statusIcon = (
			<StatusMorph
				state={morphState(core)}
				tone="semantic"
				resetAfter={0}
				haptic={sound}
				labels={{ loading: "", success: "", error: announcement(name, errorLabel) }}
				idle={glyph(shown)}
				style={MORPH_STYLE}
			/>
		);

		return (
			<Button
				{...(restProps as Partial<ButtonProps>)}
				type="button"
				ref={ref}
				variant={variant ?? (shown ? "outline" : "primary")}
				size={size}
				disabled={disabled}
				label={name}
				className={classes}
				iconStart={statusIcon}
				aria-pressed={shown}
				aria-busy={core.phase === "pending" ? "true" : undefined}
				data-state={core.phase}
				onClick={handleClick}
			>
				{/*
					The visible text sits in a one-cell grid stacking four `aria-hidden`
					ghosts (follow, following, unfollow, error) under the live span: the
					cell is as wide as the widest, in pure CSS, so the button never
					changes width when the text swaps and nothing is measured
					(SSR-safe). The unfollow preview is the same: a second layer in the
					live span that a hover or keyboard focus on a fine pointer reveals in
					CSS, so no state, no listener and no layout shift carry it.
				*/}
				{iconOnly ? null : (
					<span className="ft-follow__label">
						<span className="ft-follow__ghost" aria-hidden="true">
							{resolvedLabels.follow}
						</span>
						<span className="ft-follow__ghost" aria-hidden="true">
							{resolvedLabels.following}
						</span>
						<span className="ft-follow__ghost" aria-hidden="true">
							{resolvedLabels.unfollow}
						</span>
						<span className="ft-follow__ghost" aria-hidden="true">
							{errorLabel}
						</span>
						{swap.leaving !== null && (
							<span className="ft-follow__leave" aria-hidden="true">
								{swap.leaving}
							</span>
						)}
						<span
							key={currentLabel}
							className="ft-follow__live"
							data-swapped={swap.swapped ? "" : undefined}
							data-preview={showsPreview ? "" : undefined}
						>
							<span className="ft-follow__rest">{currentLabel}</span>
							{showsPreview && (
								<span className="ft-follow__preview" aria-hidden="true">
									{resolvedLabels.unfollow}
								</span>
							)}
						</span>
					</span>
				)}
			</Button>
		);
	}
);

FollowButton.displayName = "FollowButton";

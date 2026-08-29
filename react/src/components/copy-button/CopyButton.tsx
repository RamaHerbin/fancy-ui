import { forwardRef, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "../../utils.js";
import { useConstant } from "../../internals/dom/ssr.js";
import { useCopy } from "../../internals/use-copy.js";
import { sound as soundFx } from "../../sound/sound.js";
import { Button } from "../button/Button.js";
import type { ButtonVariant, ButtonSize } from "../button/types.js";
import { StatusMorph, type StatusMorphState } from "../status-morph/StatusMorph.js";
import "./copy-button.css";

export interface CopyButtonProps {
	/** The text written to the clipboard on activation */
	value: string;
	/** Idle label */
	label?: string;
	/** Label shown for `resetMs` after a successful copy */
	copiedLabel?: string;
	/** Label and announcement shown for `resetMs` after a failed copy */
	errorLabel?: string;
	/** How long the copied state holds before reverting, in milliseconds */
	resetMs?: number;
	/** Passed straight through to the underlying Button */
	variant?: ButtonVariant;
	/** Passed straight through to the underlying Button */
	size?: ButtonSize;
	/** Disables the button and blocks the copy */
	disabled?: boolean;
	/** Drops the visible label, moving it to `aria-label` instead */
	iconOnly?: boolean;
	/** Called with the value and whether the write actually succeeded */
	onCopy?: (value: string, ok: boolean) => void;
	/**
	 * Overrides the default icon + label content. The success/failure skins
	 * (border, background, text colour) and the disabled/copy wiring still
	 * apply — set `iconOnly` too if the custom content has no readable text,
	 * so the button keeps an accessible name.
	 */
	children?: ReactNode;
	/** Additional CSS classes */
	className?: string;
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

/**
 * The copy glyph handed to StatusMorph's `idle` slot. A module-scope constant
 * rather than a per-render element: it never varies, and a stable identity
 * keeps that subtree from re-reconciling on every render of the parent.
 */
const COPY_ICON: ReactNode = (
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
		<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
		<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
	</svg>
);

/*
 * The inline `style` rides StatusMorph's rest props and lands as an attribute,
 * which beats its own `.ft-statusmorph { width: calc(1em + 1px) }` — a
 * `className="size-4"` would lose here, because Tailwind utilities are layered
 * and StatusMorph's own rule is not. `font-size` is set alongside it so
 * StatusMorph's INNER `calc(1em + 1px)` (the SVG, which the outer width does
 * not reach) resolves to the same `1rem`: the glyph then fills the box exactly,
 * holding the 16px footprint the copy icon has today instead of sitting 2px
 * short of it in the top-left corner.
 *
 * `--ft-statusmorph-error` is set to the SAME chain the failure skin in
 * `copy-button.css` resolves, because the two fallbacks in the family disagree:
 * StatusMorph's own last-resort red is `oklch(0.5 0.19 25)` /
 * `oklch(0.7 0.18 25)` and the skin's is `oklch(0.577 0.245 27.325)` /
 * `oklch(0.704 0.191 22.216)`. The package ships no stylesheet, so "neither
 * token declared" is the out-of-the-box case — and there a 16px cross would sit
 * inside a label and a border painted a visibly different red. Reading
 * `--ft-status-error` first keeps a theme that sets it winning on both
 * surfaces; setting neither now yields one red instead of two. The success pair
 * needs no equivalent: both `--ft-status-done` fallbacks are already
 * character-identical.
 */
const MORPH_STYLE = {
	width: "1rem",
	height: "1rem",
	fontSize: "calc(1rem - 1px)",
	"--ft-statusmorph-error":
		"var(--ft-status-error, light-dark(oklch(0.577 0.245 27.325), oklch(0.704 0.191 22.216)))",
} as CSSProperties;

export const CopyButton = forwardRef<HTMLButtonElement | HTMLAnchorElement, CopyButtonProps>(
	function CopyButton(
		{
			value,
			label = "Copy",
			copiedLabel = "Copied",
			errorLabel = "Copy failed",
			resetMs = 2000,
			variant = "outline",
			size = "md",
			disabled = false,
			iconOnly = false,
			onCopy,
			children,
			className,
			sound = false,
		},
		ref
	) {
		// Read once, on purpose: `createCopy` takes its reset delay as a
		// constructor argument, not a reactive input, so `resetMs` is not meant
		// to be retuned after the button has mounted. The same frozen value is
		// handed to StatusMorph below — a reactive `resetAfter` there would let a
		// post-mount `resetMs` retime the glyph without retiming the skin, and
		// the two would then disagree for exactly the difference between them.
		const resetWindow = useConstant(() => resetMs);
		const copyState = useCopy(resetWindow);

		// The same latest-attempt guard `useCopy` keeps for `copied`, kept here
		// for the state this component owns. A permission prompt can hold one
		// write open across a second click, and both promises then resolve in
		// whatever order the user agent settled them: without the ticket, a first
		// click's late failure would repaint the error skin over a second click's
		// success, and `copyState.copied` — which IS ticket-guarded — would
		// disagree with it.
		const attempt = useRef(0);

		// The glyph's own state. React has no two-way binding, so StatusMorph's
		// `onStateChange` — the port's stand-in for `bind:state` — is what walks
		// this back to "idle" when the morph's own `resetAfter` timer fires.
		// Deliberately not a second authority for the success window: `useCopy`
		// still owns `copyState.copied` (the skin and the visible label), and
		// both windows are armed in the same tick with the same duration, so no
		// synchronisation code is needed — `handleClick` only has to make sure a
		// repeat click re-arms both rather than one.
		const [morphState, setMorphState] = useState<StatusMorphState>("idle");

		// Svelte's `{#if children}` and `children ? … : …` are truthiness tests;
		// this keeps the same reading, and gives the reset effect below a stable
		// dependency instead of a ReactNode whose identity changes every render.
		const hasChildren = Boolean(children);

		const currentLabel =
			morphState === "error" ? errorLabel : copyState.copied ? copiedLabel : label;

		// One attempt, one skin. The success class is gated on the ABSENCE of an
		// error, not merely on `copyState.copied`: `copy()` returns from its
		// `catch` before it touches that flag, so a failure landing inside a
		// standing success window leaves `copied` true while the glyph is already
		// on "error". Without the guard the button would carry both skins at once
		// and which red-or-green actually painted would come down to the order
		// the two rules happen to sit in the stylesheet — a coin toss, and a
		// public class list claiming two contradictory outcomes.
		const classes = cn(
			"ft-copybtn",
			copyState.copied && morphState !== "error" && "ft-copybtn--copied border",
			morphState === "error" && "ft-copybtn--failed border",
			className
		);

		async function handleClick() {
			// This click is the only user gesture in the interaction, and the
			// outcome cue below plays after an await: on a reload with sound
			// already enabled no AudioContext exists yet, and by then the
			// transient activation may be gone. Creating/resuming it here,
			// synchronously, keeps that cue audible.
			if (sound && soundFx.enabled) void soundFx.unlock();
			// Clears any standing outcome before the new attempt, for two reasons:
			// the previous confirmation is stale the moment a fresh copy is in
			// flight, and StatusMorph re-arms its reset timer on a state CHANGE
			// only — writing "success" over "success" would leave the glyph on the
			// first click's deadline while `useCopy` restarts the skin's. The
			// await between the two writes is what makes this a real change rather
			// than a no-op collapsed inside a single render.
			setMorphState("idle");
			// `copy()` resolves false instead of throwing on a denied permission or
			// a missing clipboard API — that outcome is reported to the caller
			// honestly, not swallowed into a silent no-op, and is now shown and
			// announced too.
			const mine = ++attempt.current;
			const ok = await copyState.copy(value);
			// `onCopy` still fires for every attempt, stale or not — it reports
			// what that call did, matching `copy()`'s own honest return. Only the
			// visible and audible cues, which describe the button's CURRENT state,
			// are dropped when a newer attempt has already spoken for them.
			if (mine === attempt.current) {
				setMorphState(ok ? "success" : "error");
				if (sound) soundFx.play(ok ? "copy" : "error");
			}
			onCopy?.(value, ok);
		}

		// StatusMorph's `resetAfter` is what normally walks `morphState` back to
		// "idle", and custom `children` replace the whole icon slot — so in that
		// composition nothing owns the timer and a failure would keep the error
		// skin, the error label and the assertive live region forever. The parent
		// takes the timer over for exactly that case, on the same window and with
		// the same 0-means-1ms clamp the morph is handed below.
		useEffect(() => {
			if (!hasChildren || morphState === "idle") return;
			const timer = setTimeout(
				() => {
					setMorphState("idle");
				},
				resetWindow > 0 ? resetWindow : 1
			);
			return () => clearTimeout(timer);
		}, [hasChildren, morphState, resetWindow]);

		/*
		 * `resetAfter` is clamped away from 0 for a vocabulary clash, not a whim:
		 * to `useCopy` a 0 window means "revert on the next tick", to StatusMorph
		 * it means "no timer at all, manual reset only". 1ms makes both read the
		 * prop the same way, so `resetMs={0}` reverts glyph and label together
		 * the way it did before the glyph existed, instead of stranding the cross
		 * on screen forever.
		 */
		const statusIcon = (
			<StatusMorph
				state={morphState}
				onStateChange={setMorphState}
				tone="semantic"
				resetAfter={resetWindow > 0 ? resetWindow : 1}
				labels={{ success: copiedLabel, error: errorLabel }}
				idle={COPY_ICON}
				style={MORPH_STYLE}
			/>
		);

		return (
			<Button
				ref={ref}
				variant={variant}
				size={size}
				disabled={disabled}
				label={iconOnly ? currentLabel : undefined}
				className={classes}
				iconStart={hasChildren ? undefined : statusIcon}
				onclick={handleClick}
			>
				{children}
				{/*
					Purely the visible label: the announcement is StatusMorph's job,
					through the `role="status"` region it portals to `document.body`
					(which is also why it never joins this button's accessible name),
					and two live regions would double-announce every copy. The one case
					with no StatusMorph at all is custom `children`, which replace
					`iconStart` — there this span keeps the announcement, because custom
					content has no way of its own to say the copy landed and colour
					alone is a sighted-only signal. Hidden whenever something else
					already owns the visible label (icon-only, or custom `children`);
					otherwise this span *is* the visible label.
				*/}
				<span
					aria-live={hasChildren ? (morphState === "error" ? "assertive" : "polite") : undefined}
					className={iconOnly || hasChildren ? "sr-only" : undefined}
				>
					{currentLabel}
				</span>
			</Button>
		);
	}
);

CopyButton.displayName = "CopyButton";

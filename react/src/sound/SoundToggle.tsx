import { forwardRef } from "react";
import { cn } from "../utils.js";
import { sound } from "./sound.js";
import { useSoundEnabled, useSoundStatus } from "./use-sound.js";
import "./sound-toggle.css";

export type SoundToggleSize = "sm" | "md" | "lg";
export type SoundToggleVariant = "outline" | "ghost";

export interface SoundToggleProps {
	/** Visual size of the control; `md` matches header-style triggers */
	size?: SoundToggleSize;
	/** `"outline"` keeps a resting border, `"ghost"` shows one only on hover */
	variant?: SoundToggleVariant;
	/** Renders the label and the On/Off word beside the icon; icon-only otherwise */
	showLabel?: boolean;
	/** Accessible name of the switch. Stays constant — the state is announced through aria-checked */
	label?: string;
	/** Visible state word when `showLabel` is set */
	labelOn?: string;
	/** Visible state word when `showLabel` is set */
	labelOff?: string;
	/** Disables the control. A browser with no Web Audio also disables it — but only while sound is off, so a stored "on" can always be undone */
	disabled?: boolean;
	/** Called after the preference flips, with the new value */
	onEnabledChange?: (enabled: boolean) => void;
	/** Additional CSS classes */
	className?: string;
}

const SIZE_CLASSES = {
	sm: "h-8 gap-1 rounded-md px-1.5 text-xs",
	md: "h-9 gap-1.5 rounded-md px-2 text-sm",
	lg: "h-10 gap-2 rounded-md px-2.5 text-sm",
} as const satisfies Record<SoundToggleSize, string>;

const ICON_SIZE = { sm: 14, md: 16, lg: 18 } as const satisfies Record<SoundToggleSize, number>;

export const SoundToggle = forwardRef<HTMLButtonElement, SoundToggleProps>(function SoundToggle(
	{
		size = "md",
		variant = "outline",
		showLabel = false,
		label = "Sound",
		labelOn = "On",
		labelOff = "Off",
		disabled = false,
		onEnabledChange,
		className,
	},
	ref
) {
	const enabled = useSoundEnabled();
	// Web Audio support is a browser fact, not a preference. A switch the engine
	// can never honour is presented disabled — but only while sound is OFF:
	// disabling it while it is on would strand the user with a persisted "on"
	// preference and no control left to undo it.
	const unsupported = useSoundStatus().engine === "unsupported";
	const effectiveDisabled = disabled || (unsupported && !enabled);

	const classes = cn(
		"ft-sound-toggle text-foreground inline-flex shrink-0 items-center font-medium transition-colors",
		"focus-visible:outline-none",
		"disabled:pointer-events-none disabled:opacity-50",
		SIZE_CLASSES[size],
		variant === "outline"
			? "border-border bg-background hover:bg-accent hover:text-accent-foreground border"
			: "hover:bg-accent hover:text-accent-foreground",
		className
	);

	// The only place a confirmation cue plays: the click that just turned
	// sound on. `unlock()` creates/resumes the AudioContext inside this same
	// gesture, and the cue only fires once that context is actually running —
	// never on the click that turns sound off, never speculatively.
	//
	// The native `disabled` attribute already blocks a real user's click, but
	// a synthetic event dispatched straight at the element — as a test does —
	// walks past that guard the same way it does on Switch/Checkbox/Toggle,
	// so the early return is repeated here rather than trusted to the
	// attribute alone.
	function handleClick() {
		if (effectiveDisabled) return;
		const next = sound.toggle();
		if (next) {
			void sound.unlock().then((ok) => {
				if (ok) sound.play("toggle-on");
			});
		}
		onEnabledChange?.(next);
	}

	return (
		<button
			ref={ref}
			type="button"
			role="switch"
			aria-checked={enabled}
			aria-label={label}
			disabled={effectiveDisabled}
			title={unsupported ? "This browser has no Web Audio support" : undefined}
			data-sound-toggle=""
			data-state={enabled ? "on" : "off"}
			data-size={size}
			data-variant={variant}
			className={classes}
			onClick={handleClick}
		>
			<svg
				className="ft-sound-toggle-icon shrink-0"
				width={ICON_SIZE[size]}
				height={ICON_SIZE[size]}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<path d="M11 5 6 9H2v6h4l5 4V5z" />
				{/* Both glyph states live in the DOM at all times — which one shows is
				    a pure CSS decision keyed off data-state on the button above, never
				    a conditional. That matters at hydration: the server renders off
				    (sound defaults to off with no storage to read), the client may
				    immediately learn the stored preference is on, and this way the
				    DOM shape never has to change to reflect it — only opacity/scale
				    do, on the very node the server already produced. */}
				<g className="ft-sound-toggle-glyph ft-sound-toggle-glyph-on">
					<path d="M15.5 8.5a5 5 0 0 1 0 7" />
					<path d="M19 5a9 9 0 0 1 0 14" />
				</g>
				<g className="ft-sound-toggle-glyph ft-sound-toggle-glyph-off">
					<path d="m16 9 6 6M22 9l-6 6" />
				</g>
			</svg>
			{showLabel && (
				<>
					<span aria-hidden="true">{label}</span>
					<span aria-hidden="true" className="text-muted-foreground">
						{enabled ? labelOn : labelOff}
					</span>
				</>
			)}
		</button>
	);
});

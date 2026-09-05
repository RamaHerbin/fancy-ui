import { forwardRef, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "../../utils.js";
import { useSoundCue } from "../../sound/use-sound.js";
import "./prompt-suggestions.css";

export interface PromptSuggestionsProps {
	/** Prompt texts offered to the user, in display order */
	suggestions: string[];
	/** Called with the chosen prompt and its index when a pill is activated */
	onSelect?: (suggestion: string, index: number) => void;
	/** Whether the pills are shown; flipping this to true replays the entrance */
	visible?: boolean;
	/** Delay between two consecutive pills entering, in milliseconds. Defaults to
	 * 60ms via a CSS fallback — omit this prop to let an ancestor's
	 * `--ft-suggestions-stagger` theme the whole subtree instead. */
	staggerMs?: number;
	/** Accessible name of the group wrapping the pills */
	label?: string;
	/** Custom pill content, receiving the suggestion and its index */
	item?: (suggestion: string, index: number) => ReactNode;
	/** Additional CSS classes */
	className?: string;
	/**
	 * Plays the matching interface cue through the sound controller. Off
	 * by default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

/** Mirrors the CSS fallback on `--ft-suggestions-delay` below. */
const DEFAULT_STAGGER_MS = 60;
/** Past this the last pill of a long row would still be waiting long after the reply landed. */
const MAX_STAGGER_MS = 400;

export const PromptSuggestions = forwardRef<HTMLDivElement, PromptSuggestionsProps>(
	function PromptSuggestions(
		{
			suggestions,
			onSelect,
			visible = true,
			staggerMs,
			label = "Suggestions",
			item,
			className,
			sound = false,
		},
		ref
	) {
		const playCue = useSoundCue(sound);
		// A negative stagger would drop later pills in mid-entrance rather than
		// delaying them, which reads as a glitch instead of a cascade. `undefined`
		// is left alone: the inline custom property is only ever written when the
		// caller actually passed a value, so an ancestor's `--ft-suggestions-stagger`
		// is free to theme the subtree otherwise.
		const stagger = staggerMs === undefined ? undefined : Math.min(Math.max(staggerMs, 0), MAX_STAGGER_MS);

		// Recreating the pills is what restarts their CSS animation, so the keyed
		// list hangs off a counter that only moves when `visible` flips false →
		// true. The effect reads `visible` and writes `generation` — never the
		// other way round; the counter's source and the previous value are plain
		// refs so nothing it touches can schedule it again.
		const [generation, setGeneration] = useState(0);
		const generationSource = useRef(0);
		const wasVisible = useRef<boolean | null>(null);

		// Runs synchronously before paint, so the re-key and the unhiding land in
		// the same DOM update: a post-paint bump would show the previous pills
		// for a frame at full opacity before replacing them with ones animating
		// up from zero.
		useLayoutEffect(() => {
			const isVisible = visible;
			// The first run only adopts the mounted value — a component that starts
			// out visible has not transitioned, and re-keying it would throw away the
			// pills the browser is already animating.
			if (wasVisible.current !== null && isVisible && !wasVisible.current) {
				generationSource.current += 1;
				setGeneration(generationSource.current);
			}
			wasVisible.current = isVisible;
		}, [visible]);

		const rootStyle: React.CSSProperties = {
			...(stagger === undefined ? {} : { "--ft-suggestions-stagger": `${stagger}ms` }),
			...(visible ? {} : { display: "none" }),
		} as React.CSSProperties;

		// A pick is an activation, not a change of a selected value — no
		// changed-only guard.
		function pick(suggestion: string, index: number) {
			playCue("select");
			onSelect?.(suggestion, index);
		}

		return (
			<div
				ref={ref}
				className={cn("flex flex-wrap items-center gap-2", className)}
				style={rootStyle}
				role="group"
				aria-label={label}
			>
				{suggestions.map((suggestion, i) => (
					<button
						key={`${generation}:${i}`}
						type="button"
						className="ft-suggestion border-border text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground focus-visible:ring-ring cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
						style={
							{
								"--ft-suggestions-delay": `calc(var(--ft-suggestions-stagger, ${DEFAULT_STAGGER_MS}ms) * ${i})`,
							} as React.CSSProperties
						}
						onClick={() => pick(suggestion, i)}
					>
						{item ? item(suggestion, i) : suggestion}
					</button>
				))}
			</div>
		);
	}
);

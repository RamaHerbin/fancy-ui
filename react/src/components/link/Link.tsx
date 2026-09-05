import { forwardRef } from "react";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { cn } from "../../utils.js";
import { useSoundCue } from "../../sound/use-sound.js";
import "./link.css";

export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className"> {
	/** Destination URL */
	href: string;
	/** Visual weight: `default` reads as inline copy, `muted` recedes into supporting text */
	variant?: "default" | "muted";
	/** Marks the destination as off-site: appends an arrow glyph and defaults `target`
	 * to `_blank`, which in turn brings the safe `rel` and the "opens in a new tab"
	 * announcement. Override `target` with `_self`, `_parent` or `_top` and both drop
	 * away — the resolved target decides those, not this flag */
	external?: boolean;
	/** When the underline shows: only on hover/focus (`hover`, the default), always, or never */
	underline?: "hover" | "always" | "none";
	/** Anchor `target`. `external` fills this in as `_blank` when left unset */
	target?: string;
	/** Anchor `rel`. Merged with, never replaced by, the `noopener noreferrer` tokens
	 * required whenever `target` opens a new browsing context — any value other than
	 * `_self`, `_parent`, or `_top` (case-insensitively), not just `_blank` */
	rel?: string;
	/** Link content */
	children?: ReactNode;
	/** Additional CSS classes */
	className?: string;
	/**
	 * Plays the matching interface cue through the sound controller. Off
	 * by default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

// Per the HTML standard, *any* target naming a browsing context that doesn't
// already exist opens a new top-level one — identical to `_blank`,
// `window.opener` intact — not just the literal string `"_blank"`. Only
// these three keywords are guaranteed to stay in the current context, and
// the standard matches them ASCII-case-insensitively.
const SAME_TAB_TARGETS = new Set(["_self", "_parent", "_top"]);

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
	{
		href,
		variant = "default",
		external = false,
		underline = "hover",
		target,
		rel,
		children,
		className,
		sound = false,
		onClick,
		...rest
	},
	ref
) {
	const playCue = useSoundCue(sound);

	// The single call site for the cue: never a second listener, and never
	// `preventDefault` — navigation is untouched, this only rides alongside it.
	function handleClick(event: MouseEvent<HTMLAnchorElement>) {
		playCue("press");
		onClick?.(event);
	}

	// `external` only *defaults* the tab target — a caller who passes both
	// `external` and an explicit `target` (e.g. a named frame) still wins.
	const computedTarget = external ? (target ?? "_blank") : target;

	// A new context that keeps a handle on `window.opener` can repaint the tab
	// it came from, so the safe tokens are non-negotiable whenever the link
	// opens one — the `_blank` that `external` defaults to, an explicit
	// `target="_blank"`, or any other named target that isn't one of the three
	// same-tab keywords above. Existing tokens are preserved with a Set so a
	// caller-supplied `rel` is extended, never dropped.
	//
	// The predicate reads the RESOLVED target and nothing else. `external`
	// alone already resolves to `_blank`, so it needs no separate clause — and
	// a caller who passes `external` with `target="_self"` genuinely stays in
	// this tab, where forcing `noreferrer` would strip a referrer the
	// destination may rely on for no safety gain.
	const opensNewContext = !!computedTarget && !SAME_TAB_TARGETS.has(computedTarget.toLowerCase());
	let computedRel = rel;
	if (opensNewContext) {
		const tokens = new Set(rel?.split(/\s+/).filter(Boolean));
		tokens.add("noopener");
		tokens.add("noreferrer");
		computedRel = [...tokens].join(" ");
	}

	const classes = cn(
		"ft-link inline-flex w-fit items-center gap-1 no-underline transition-colors focus-visible:outline-none",
		variant === "default" ? "ft-link--default text-sm" : "text-muted-foreground text-[13px]",
		underline === "always" && "underline underline-offset-[3px]",
		underline === "hover" &&
			"hover:underline focus-visible:underline hover:underline-offset-[3px] focus-visible:underline-offset-[3px]",
		className
	);

	return (
		<a
			ref={ref}
			href={href}
			target={computedTarget}
			rel={computedRel}
			className={classes}
			onClick={handleClick}
			{...rest}
		>
			{children}
			{external && (
				<>
					<svg
						aria-hidden="true"
						viewBox="0 0 24 24"
						width="0.7em"
						height="0.7em"
						fill="none"
						stroke="currentColor"
						strokeWidth="2.5"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="ft-link-icon shrink-0"
					>
						<path d="M7 17 17 7" />
						<path d="M8 7h9v9" />
					</svg>
					{/*
						The arrow says "off-site", which `external` alone settles.
						This sentence says "and it will open somewhere else", which
						only the resolved target can settle — an `external` link
						pointed back at `_self` stays right here, and announcing a
						new tab that never opens is a lie a screen-reader user acts
						on.
					*/}
					{opensNewContext && <span className="sr-only"> (opens in a new tab)</span>}
				</>
			)}
		</a>
	);
});

<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface LinkProps {
		/** Destination URL */
		href: string;
		/** Visual weight: `default` reads as inline copy, `muted` recedes into supporting text */
		variant?: "default" | "muted";
		/** Marks the destination as off-site: appends an arrow glyph, defaults `target` to
		 * `_blank`, and guarantees a safe `rel` */
		external?: boolean;
		/** When the underline shows: only on hover/focus (`hover`, the default), always, or never */
		underline?: "hover" | "always" | "none";
		/** Anchor `target`. `external` fills this in as `_blank` when left unset */
		target?: string;
		/** Anchor `rel`. Merged with, never replaced by, the `noopener noreferrer` tokens
		 * required whenever `target` opens a new browsing context — any value other than
		 * `_self`, `_parent`, or `_top` (case-insensitively), not just `_blank` */
		rel?: string;
		/** Native click handler */
		onclick?: (event: MouseEvent) => void;
		/** Link content */
		children?: Snippet;
		/** Additional CSS classes */
		class?: string;
		/** Element reference */
		ref?: HTMLAnchorElement | null;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let {
		href,
		variant = "default",
		external = false,
		underline = "hover",
		target,
		rel,
		onclick,
		children,
		class: className,
		ref = $bindable(null),
	}: LinkProps = $props();

	// `external` only *defaults* the tab target — a caller who passes both
	// `external` and an explicit `target` (e.g. a named frame) still wins.
	const computedTarget = $derived(external ? (target ?? "_blank") : target);

	// Per the HTML standard, *any* target naming a browsing context that
	// doesn't already exist opens a new top-level one — identical to
	// `_blank`, `window.opener` intact — not just the literal string
	// `"_blank"`. Only these three keywords are guaranteed to stay in the
	// current context, and the standard matches them ASCII-case-insensitively.
	const SAME_TAB_TARGETS = new Set(["_self", "_parent", "_top"]);

	// A new context that keeps a handle on `window.opener` can repaint the tab
	// it came from, so the safe tokens are non-negotiable whenever the link
	// opens one — `external`, an explicit `target="_blank"`, or any other
	// named target that isn't one of the three same-tab keywords above.
	// Existing tokens are preserved with a Set so a caller-supplied `rel` is
	// extended, never dropped.
	const computedRel = $derived.by(() => {
		const opensNewContext =
			external || (!!computedTarget && !SAME_TAB_TARGETS.has(computedTarget.toLowerCase()));
		if (!opensNewContext) return rel;

		const tokens = new Set(rel?.split(/\s+/).filter(Boolean));
		tokens.add("noopener");
		tokens.add("noreferrer");
		return [...tokens].join(" ");
	});

	const classes = $derived(
		cn(
			"ft-link inline-flex w-fit items-center gap-1 no-underline transition-colors focus-visible:outline-none",
			variant === "default" ? "ft-link--default text-sm" : "text-muted-foreground text-[13px]",
			underline === "always" && "underline underline-offset-[3px]",
			underline === "hover" &&
				"hover:underline focus-visible:underline hover:underline-offset-[3px] focus-visible:underline-offset-[3px]",
			className
		)
	);
</script>

<a bind:this={ref} {href} target={computedTarget} rel={computedRel} class={classes} {onclick}>
	{@render children?.()}
	{#if external}
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			width="0.7em"
			height="0.7em"
			fill="none"
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="ft-link-icon shrink-0"
		>
			<path d="M7 17 17 7" />
			<path d="M8 7h9v9" />
		</svg>
		<span class="sr-only">{" "}(opens in a new tab)</span>
	{/if}
</a>

<style>
	/*
	 * `--ft-accent` is the brand purple shared, by name only, across every
	 * component in the Actions family — none of them can reach a real shared
	 * token file, so each declares the same fallback locally under its own
	 * name (`--ft-link-accent`) and *reads* `--ft-accent` through `var()`
	 * rather than redeclaring it. A flat `--ft-accent: …` here would shadow
	 * whatever an ancestor set, since a property declared on a closer element
	 * always wins regardless of its value — that would make retinting the
	 * family from a shared ancestor silently stop working for this component
	 * alone.
	 */
	.ft-link {
		--ft-link-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
	}

	/*
	 * The muted variant intentionally skips these two custom properties and
	 * uses the ordinary `text-muted-foreground` token instead — it is supporting
	 * copy, not a call to action, so it does not carry the brand hue.
	 */
	.ft-link--default {
		color: var(--ft-link, light-dark(oklch(0.45 0.1013 293.57), oklch(0.8112 0.1013 293.57)));
	}

	.ft-link--default:hover {
		color: var(--ft-link-hover, light-dark(oklch(0.36 0.1013 293.28), oklch(0.8943 0.0549 293.28)));
	}

	.ft-link:focus-visible {
		border-radius: 3px;
		box-shadow: 0 0 0 3px color-mix(in oklch, var(--ft-link-accent) 35%, transparent);
	}
</style>

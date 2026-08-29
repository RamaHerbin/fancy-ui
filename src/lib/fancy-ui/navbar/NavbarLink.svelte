<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface NavbarLinkProps {
		/** Destination URL. */
		href: string;
		/**
		 * Marks this as the page the visitor is already on: `aria-current="page"`
		 * plus a visible weight/colour change and an accent underline — current
		 * is never conveyed by colour alone.
		 */
		current?: boolean;
		/**
		 * Opens the link in a new tab with a safe `rel`, and appends a
		 * visually-hidden "(opens in a new tab)" note to the accessible name.
		 */
		external?: boolean;
		/** Strips the link out of the click and keyboard-activation paths. */
		disabled?: boolean;
		/** Native click handler. Never called while `disabled`. */
		onclick?: (event: MouseEvent) => void;
		/** The link's label. */
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
		current = false,
		external = false,
		disabled = false,
		onclick,
		children,
		class: className,
		ref = $bindable(null),
	}: NavbarLinkProps = $props();

	const classes = $derived(
		cn(
			"ft-navbar-link inline-flex shrink-0 items-center rounded-[4px] px-0.5 pb-[3px] text-[13px] whitespace-nowrap transition-colors",
			"focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none",
			current ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground",
			disabled && "pointer-events-none opacity-50",
			className
		)
	);

	// An <a> has no native `disabled` state at all, and a synthetic click (a
	// test's `fireEvent.click`, some assistive tech) reaches this handler
	// without going through any browser gate — `aria-disabled` and the
	// stripped `href` below are the visual/semantic story, this guard is what
	// actually stops the callback.
	function handleClick(event: MouseEvent) {
		if (disabled) {
			event.preventDefault();
			return;
		}
		onclick?.(event);
	}
</script>

<a
	bind:this={ref}
	href={disabled ? undefined : href}
	target={external ? "_blank" : undefined}
	rel={external ? "noopener noreferrer" : undefined}
	aria-current={current ? "page" : undefined}
	aria-disabled={disabled ? "true" : undefined}
	tabindex={disabled ? -1 : undefined}
	class={classes}
	onclick={handleClick}
>
	{@render children?.()}
	{#if external}
		<span class="sr-only">{" "}(opens in a new tab)</span>
	{/if}
</a>

<style>
	/*
	 * Declared here too, not just on Navbar's root: `NavbarLink` is a fully
	 * standalone component ("keep them independent so a consumer can put a
	 * NavbarLink anywhere" — a mobile menu, a footer), so relying on
	 * inheritance alone would leave the underline missing wherever it
	 * doesn't happen to render as a Navbar descendant. Same shape as
	 * `Autocomplete`/`Combobox`/`TimePicker`'s `--ft-field-accent` and
	 * `Button`'s `--ft-btn-accent` — every one of those declares its own
	 * copy of the same formula rather than trusting an ancestor. This reads
	 * `--ft-accent`, never redeclares it, so a consumer retinting the whole
	 * tree from higher up still reaches this.
	 */
	.ft-navbar-link {
		--ft-nav-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
		/* The underline below is an absolutely-positioned pseudo, which needs a
		   containing block. An inline-flex anchor taking `position: relative`
		   changes no layout. */
		position: relative;
	}

	/*
	 * The accent underline, character-for-character the declaration that used to
	 * sit on the anchor itself — same inset shadow, same inherited radius, so
	 * the resting look is unchanged. It lives one layer down for two reasons.
	 * It can now be transitioned without transitioning the focus ring, which
	 * shares the `box-shadow` property and must never animate. And it frees the
	 * anchor's own `box-shadow`, which Tailwind's `focus-visible:ring-2`
	 * compiles to: unlayered scoped CSS beats `@layer utilities` regardless of
	 * specificity, so until now the current link's own underline was
	 * suppressing its focus ring entirely.
	 */
	.ft-navbar-link::before {
		content: "";
		position: absolute;
		inset: 0;
		border-radius: inherit;
		pointer-events: none;
		box-shadow: inset 0 -2px 0 var(--ft-nav-accent);
		opacity: 0;
	}

	.ft-navbar-link[aria-current="page"]::before {
		opacity: 1;
	}

	@media (prefers-reduced-motion: no-preference) {
		/* `transform-origin: center` rather than a leading edge is deliberate:
		   unlike a sliding tab indicator this bar never travels between
		   siblings, so there is no leading edge to grow from, and `center`
		   reads the same in both writing directions for free.
		   150ms = tokens.DURATIONS.fast, cubic-bezier(0.4, 0, 0.2, 1) = tokens.EASINGS.inout */
		.ft-navbar-link::before {
			transition:
				opacity var(--ft-navbar-signal-duration, var(--ft-duration-fast, 150ms))
					var(--ft-ease-inout, cubic-bezier(0.4, 0, 0.2, 1)),
				transform var(--ft-navbar-signal-duration, var(--ft-duration-fast, 150ms))
					var(--ft-ease-inout, cubic-bezier(0.4, 0, 0.2, 1));
			transform: scaleX(0.4);
			transform-origin: center;
		}

		.ft-navbar-link[aria-current="page"]::before {
			transform: scaleX(1);
		}
	}
</style>

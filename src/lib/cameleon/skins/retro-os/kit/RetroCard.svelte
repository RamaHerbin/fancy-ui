<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";
	import type { Accent } from "./accents.js";

	export interface RetroCardProps extends HTMLAttributes<HTMLElement> {
		/** renders an <a> instead of a <div> */
		href?: string;
		/** when set, the hover shadow recolours from ink to this accent */
		accent?: Accent;
		/** card background — any CSS colour value, normally a --r-tint-* var */
		bg?: string;
		class?: string;
		children: Snippet;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { accentVar } from "./accents.js";

	let {
		href,
		accent,
		bg = "var(--r-paper)",
		class: className,
		style,
		children,
		...rest
	}: RetroCardProps = $props();

	// Both hooks are custom properties so the single .r-card rule below can stay
	// static — Svelte scopes it once and the dynamic part never touches the CSS.
	// A caller's own `style` is appended rather than dropped: it is pulled out of
	// `rest` on purpose, because spreading it would silently erase these two.
	const cardStyle = $derived(
		`--r-card-bg:${bg};--r-card-hover:${accent ? accentVar(accent) : "var(--r-ink)"};${style ?? ""}`
	);
</script>

<!--
	Grammar D — the generic retro card (work cards, testimonials, gear, projects,
	prev/next). 2px ink border, 3px hard shadow, 20px padding, column flow.

	Hover physics live behind @media (hover:hover) so a touch device never gets a
	stuck :hover state, and there is no transition — the retro language cuts hard
	rather than easing. `accent` recolours the grown shadow (the perso project
	cards' signature move); without it the shadow just grows in ink.

	The RESTING shadow is `.r-shadow-3`. A caller that needs another rung (the
	inactive testimonial card's soft ink, the active one's hard 4px) adds the
	matching `.r-shadow-*` class through `class` — kit.css declares the ladder
	in ascending order precisely so the later class wins at equal specificity.
-->
{#if href}
	<a {...rest} {href} class={cn("r-card r-border r-shadow-3", className)} style={cardStyle}>
		{@render children()}
	</a>
{:else}
	<div {...rest} class={cn("r-card r-border r-shadow-3", className)} style={cardStyle}>
		{@render children()}
	</div>
{/if}

<style>
	/* border + resting shadow come from the .r-border / .r-shadow-3 recipes.
	   .r-pressable is deliberately NOT used: it ladders the hover shadow in ink,
	   and this card may recolour it — so it owns both interaction states below. */
	.r-card {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 20px;
		background: var(--r-card-bg);
		color: var(--r-ink);
		text-decoration: none;
	}

	@media (hover: hover) {
		.r-card:hover {
			transform: translate(-1px, -1px);
			box-shadow: 4px 4px 0 var(--r-card-hover);
		}
	}

	/* press feedback only on the linked form — a plain content card has nothing
	   to press, and the mockup's non-link cards have no active state either */
	a.r-card:active {
		transform: translate(2px, 2px);
		box-shadow: 0 0 0 var(--r-ink);
	}
</style>

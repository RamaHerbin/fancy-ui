<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { Accent } from "./accents.js";

	export interface SectionWindowProps {
		/** DOM id — callers pass the already `retro-`prefixed form (e.g. "retro-connect") */
		id?: string;
		/** two-digit section index ("01"). Omit for an index-less titlebar (BnF brief). */
		index?: string;
		/** "/ 01" on the home page, "( 01 )" on the case pages */
		indexStyle?: "slash" | "paren";
		/** the Silkscreen title */
		title: string;
		/** the right-aligned DOS filename label, e.g. "SUMMARY.EXE" */
		dosLabel: string;
		/** colour of the 12px titlebar dot */
		accent: Accent;
		/** optional centered caption row under the titlebar */
		caption?: string;
		class?: string;
		children: Snippet;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { accentVar } from "./accents.js";

	let {
		id,
		index,
		indexStyle = "slash",
		title,
		dosLabel,
		accent,
		caption,
		class: className,
		children,
	}: SectionWindowProps = $props();

	// The index is structural chrome, not content — it never gets a data-edit.
	const indexLabel = $derived(
		index === undefined ? "" : indexStyle === "paren" ? `( ${index} )` : `/ ${index}`
	);
</script>

<!--
	Grammar A — the section window: bordered paper slab, 4px hard shadow, DOS
	titlebar. Home and case pages share one component; the ONLY difference is the
	index format ("/ 01" vs "( 01 )"), hence `indexStyle`.

	The titlebar is allowed to wrap: Silkscreen is a wide face and the DOS label
	would otherwise force a horizontal scroll on narrow screens. Borders and the
	shadow never scale.
-->
<section {id} class={cn("r-window r-border r-shadow-4", className)}>
	<div class="r-window-bar">
		<span class="r-border r-window-dot" style="background: {accentVar(accent)}"></span>
		{#if indexLabel}
			<span class="r-mono r-window-index">{indexLabel}</span>
		{/if}
		<h2 class="r-pixel r-window-title">{title}</h2>
		<span class="r-window-spacer"></span>
		<span class="r-mono r-window-dos">{dosLabel}</span>
	</div>

	{#if caption}
		<div class="r-mono r-window-caption">{caption}</div>
	{/if}

	{@render children()}
</section>

<style>
	/* border + shadow come from the .r-border / .r-shadow-4 recipes (kit.css) */
	.r-window {
		background: var(--r-paper);
	}

	.r-window-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
		padding: 12px 18px;
		border-bottom: 2px solid var(--r-ink);
	}

	.r-window-dot {
		width: 12px;
		height: 12px;
		flex: none;
		box-sizing: border-box;
	}

	.r-window-index {
		font-size: 11px;
		font-weight: 700;
		color: var(--r-muted);
	}

	.r-window-title {
		margin: 0;
		font-size: 12px;
		text-transform: uppercase;
	}

	.r-window-spacer {
		flex: 1;
	}

	.r-window-dos {
		font-size: 10.5px;
		font-weight: 600;
		letter-spacing: 1px;
		color: var(--r-muted);
	}

	.r-window-caption {
		padding: 18px 20px 0;
		text-align: center;
		font-size: 12px;
		color: var(--r-muted);
	}
</style>

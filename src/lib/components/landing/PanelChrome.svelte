<!--
	Shared chrome for the numbered showcase panels: the 40px mono header strip
	(index + name, optional centre hint, Svelte badge, docs link, copy button)
	and the 26px coordinate footer. The panel's demo goes in between via the
	children snippet, so every panel reads as the same instrument with a
	different specimen inside.
-->
<script lang="ts">
	import type { Snippet } from "svelte";

	interface Props {
		/** Two-digit ordinal shown before the name, e.g. "01". */
		index: string;
		/** Upper-cased panel name, e.g. "FLUID CURSOR". */
		title: string;
		/** Registry slug — the docs link goes to /docs/components/<slug>. */
		slug: string;
		/** Optional centre label in the header ("MOVE TO EXPLORE"). */
		hint?: string;
		/** What the ⧉ button puts on the clipboard. */
		copyText: string;
		/** Compact header drops the hint and the framework badge, and tightens the trailing cells. */
		compact?: boolean;
		/** Footer coordinate readout: x-only (tall hero panel) or x+y. */
		coords?: "x" | "xy";
		/** The hero panel precedes the first section heading, so it is an h2. */
		headingLevel?: 2 | 3;
		children?: Snippet;
	}

	let {
		index,
		title,
		slug,
		hint,
		copyText,
		compact = false,
		coords = "xy",
		headingLevel = 3,
		children,
	}: Props = $props();

	let copied = $state(false);
	let resetTimer: ReturnType<typeof setTimeout> | undefined;

	async function copy() {
		try {
			await navigator.clipboard.writeText(copyText);
			copied = true;
			clearTimeout(resetTimer);
			resetTimer = setTimeout(() => (copied = false), 1500);
		} catch {
			// Clipboard access denied — the button just stays inert.
		}
	}
</script>

<div class="flex h-full min-w-0 flex-col">
	<div class="lp-panel-head">
		<svelte:element
			this="h{headingLevel}"
			class="flex min-w-0 items-center px-4 font-normal"
			style="color:var(--lp-grey-1)"
		>
			<span class="truncate whitespace-nowrap">{index} — {title}</span>
		</svelte:element>
		{#if hint}
			<span
				class="hidden flex-1 items-center justify-center sm:flex"
				style="color:var(--lp-grey-3)">{hint}</span
			>
		{:else}
			<span class="flex-1"></span>
		{/if}
		<span
			class="lp-line hidden items-center gap-[7px] border-l px-3.5 whitespace-nowrap {compact
				? ''
				: 'sm:flex'}"
			style="color:var(--lp-grey-2)"
			title="Ships for Svelte and React"
			>Svelte · React</span
		>
		<a
			href="/docs/components/{slug}"
			class="lp-link lp-line flex items-center gap-1.5 border-l whitespace-nowrap {compact
				? 'px-3'
				: 'px-3.5'}"
			><span class="hidden sm:inline">View</span> docs ↗</a
		>
		<button
			type="button"
			class="lp-link lp-line flex items-center gap-1.5 border-l whitespace-nowrap {compact
				? 'px-3'
				: 'px-3.5'}"
			onclick={copy}
			aria-label="Copy import for {title}"
		>
			{#if copied}✓{:else if compact}⧉{:else}<span class="hidden sm:inline">Copy</span> ⧉{/if}
		</button>
		<span class="sr-only" aria-live="polite">{copied ? `Copied import for ${title}` : ""}</span>
	</div>

	{@render children?.()}

	<div class="lp-panel-foot" aria-hidden="true">
		{#if coords === "x"}
			<span>X — 000</span>
			<span class="flex items-center gap-3.5"
				><span>X — 1000</span><span style="color:var(--lp-grey-4)">+</span></span
			>
		{:else}
			<span class="flex gap-3.5"><span>X — 000</span><span>Y — 000</span></span>
			<span class="flex items-center gap-3.5"
				><span>X — 1000</span><span>Y — 600</span><span style="color:var(--lp-grey-4)">+</span></span
			>
		{/if}
	</div>
</div>

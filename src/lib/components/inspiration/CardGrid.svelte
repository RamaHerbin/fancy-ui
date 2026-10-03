<!--
	The card grid shared by the gallery, the saved page and the "Related" row:
	3 / 2 / 1 columns, gap 24 (16 on phones). Saved state is read through the
	store the page owns, so every card on a page agrees.
-->
<script lang="ts">
	import { posterFor } from "$lib/inspiration/catalog.js";
	import type { Framework, Reference } from "$lib/inspiration/types.js";
	import InspirationCard from "./InspirationCard.svelte";
	import { cardFrameworks } from "./labels.js";

	interface Props {
		entries: readonly Reference[];
		/** Component slug → ported frameworks (server-baked). */
		ports: Record<string, Framework[]>;
		isSaved: (id: string) => boolean;
		onToggleSaved: (entry: Reference) => void;
		allowLive?: boolean;
		/** Accessible name of the list. */
		label?: string;
		class?: string;
	}

	let {
		entries,
		ports,
		isSaved,
		onToggleSaved,
		allowLive = true,
		label,
		class: className = "",
	}: Props = $props();
</script>

<ul
	class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 {className}"
	aria-label={label}
>
	{#each entries as entry, i (entry.id)}
		<li class="flex min-w-0">
			<InspirationCard
				{entry}
				index={i}
				poster={posterFor(entry)}
				frameworks={cardFrameworks(entry, ports)}
				saved={isSaved(entry.id)}
				{onToggleSaved}
				{allowLive}
				eager={i < 3}
			/>
		</li>
	{/each}
</ul>

<style>
	li > :global(.ic) {
		flex: 1;
	}
</style>

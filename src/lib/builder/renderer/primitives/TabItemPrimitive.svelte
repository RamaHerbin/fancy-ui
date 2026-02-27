<script lang="ts">
	import { cn } from "$lib/utils";
	import { getContext, onMount } from "svelte";
	import type { Snippet } from "svelte";

	interface Props {
		label?: string;
		value?: string;
		class?: string;
		children?: Snippet;
	}

	let { label = "Tab", value = "tab", class: className = "", children }: Props = $props();

	const tabsCtx = getContext<{
		readonly activeTab: string;
		registerTab: (info: { value: string; label: string }) => void;
	}>("builder:tabs");

	onMount(() => {
		tabsCtx?.registerTab({ value, label });
	});

	let isActive = $derived(tabsCtx?.activeTab === value);
</script>

{#if isActive}
	<div class={cn("flex-1 outline-none", className)}>
		{#if children}
			{@render children()}
		{/if}
	</div>
{/if}

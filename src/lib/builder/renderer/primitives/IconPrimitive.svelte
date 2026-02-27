<script lang="ts">
	import { cn } from "$lib/utils";
	import type { Component } from "svelte";
	import * as icons from "@lucide/svelte";

	interface Props {
		name?: string;
		size?: number;
		color?: string;
		class?: string;
	}

	let { name = "Star", size = 24, color = "", class: className = "" }: Props = $props();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const iconMap = icons as unknown as Record<string, Component<any>>;

	let IconComponent = $derived(iconMap[name] ?? iconMap["Star"]);
</script>

{#if IconComponent}
	<IconComponent {size} {color} class={cn(className)} />
{/if}

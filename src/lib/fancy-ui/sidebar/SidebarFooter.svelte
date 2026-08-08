<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface SidebarFooterProps {
		/** A decorative avatar, shown even when the sidebar is collapsed. */
		avatar?: Snippet;
		/** The name / text next to the avatar. Moves to `sr-only` while collapsed — never removed. */
		children?: Snippet;
		/** Additional CSS classes */
		class?: string;
		/** Element reference */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { getContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import SidebarSeparator from "./SidebarSeparator.svelte";
	import { SIDEBAR_KEY, type SidebarContext } from "./types.js";

	let { avatar, children, class: className, ref = $bindable(null) }: SidebarFooterProps = $props();

	const sidebar = getContext<SidebarContext | undefined>(SIDEBAR_KEY);
	const collapsed = $derived(sidebar?.collapsed ?? false);
</script>

<div bind:this={ref} class={cn("ft-sidebar-footer mt-auto flex w-full flex-col", className)}>
	<SidebarSeparator />
	<div
		class={cn(
			"flex items-center gap-2.5 px-2 py-[7px] text-[12px]",
			"text-muted-foreground",
			collapsed && "justify-center"
		)}
	>
		{#if avatar}
			<span class="shrink-0" aria-hidden="true">
				{@render avatar()}
			</span>
		{/if}
		<span class={cn("min-w-0 truncate", collapsed && "sr-only")}>
			{@render children?.()}
		</span>
	</div>
</div>

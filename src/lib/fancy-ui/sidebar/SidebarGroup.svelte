<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface SidebarGroupProps {
		/** The section heading, e.g. `"General"`. Required — read by `aria-labelledby`, not decorative. */
		label: string;
		/** The `SidebarItem`s in this section. */
		children?: Snippet;
		/** Additional CSS classes */
		class?: string;
	}
</script>

<script lang="ts">
	import { getContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { SIDEBAR_KEY, type SidebarContext } from "./types.js";

	let { label, children, class: className }: SidebarGroupProps = $props();

	// `undefined` outside a Sidebar: the group still renders correctly, just
	// never in the icon-only collapsed presentation.
	const sidebar = getContext<SidebarContext | undefined>(SIDEBAR_KEY);
	const collapsed = $derived(sidebar?.collapsed ?? false);

	// SSR-stable — `uid()` throws outside the browser, and this id has to
	// exist on the very first server-rendered markup for `aria-labelledby`
	// to point at something real.
	const headingId = $props.id();
</script>

<div class={cn("ft-sidebar-group flex w-full flex-col gap-0.5", className)}>
	<span
		id={headingId}
		class={cn(
			"text-muted-foreground/70 px-2 py-1 text-[10px] font-semibold tracking-[0.08em] uppercase",
			collapsed && "sr-only"
		)}
	>
		{label}
	</span>
	<ul class="m-0 flex list-none flex-col gap-0.5 p-0" aria-labelledby={headingId}>
		{@render children?.()}
	</ul>
</div>

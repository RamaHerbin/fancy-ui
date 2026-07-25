<script lang="ts">
	import type { ComponentMeta } from "$lib/types.js";
	import { t, tCategory } from "$lib/stores";

	interface Props {
		component: ComponentMeta;
	}

	let { component }: Props = $props();
</script>

<a
	href="/docs/components/{component.slug}"
	class="bg-card hover:bg-accent group flex flex-col overflow-hidden rounded-xl border transition-all hover:shadow-md"
>
	<!-- Preview area -->
	<div class="bg-muted/30 flex h-32 items-center justify-center border-b">
		<span class="text-muted-foreground/40 text-3xl font-bold tracking-tighter">
			{component.name.slice(0, 2)}
		</span>
	</div>

	<!-- Info -->
	<div class="flex flex-1 flex-col gap-1.5 p-4">
		<div class="flex items-center justify-between">
			<h3 class="text-foreground text-sm font-semibold">{component.name}</h3>
			<svg
				class="text-muted-foreground h-4 w-4 transition-transform group-hover:translate-x-0.5"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
		</div>
		<p class="text-muted-foreground line-clamp-2 text-xs">{component.description}</p>
		<div class="mt-auto flex items-center gap-2 pt-2">
			<span class="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-medium">
				{tCategory(component.category)}
			</span>
			{#if component.status === "done"}
				<span
					class="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400"
				>
					{t("status.stable")}
				</span>
			{/if}
		</div>
	</div>
</a>

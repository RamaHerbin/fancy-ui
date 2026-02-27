<script lang="ts">
	import { cn } from "$lib/utils";

	interface Props {
		src?: string;
		title?: string;
		description?: string;
		action?: string;
		class?: string;
	}

	let {
		src = "",
		title = "Document",
		description = "",
		action = "download",
		class: className = "",
	}: Props = $props();
</script>

{#if action === "embed" && src}
	<div class={cn("overflow-hidden rounded-lg border", className)}>
		{#if title || description}
			<div class="border-b px-4 py-3">
				{#if title}<p class="font-medium">{title}</p>{/if}
				{#if description}<p class="text-muted-foreground text-sm">{description}</p>{/if}
			</div>
		{/if}
		<iframe {src} {title} class="h-[500px] w-full" frameborder="0"></iframe>
	</div>
{:else}
	<a
		href={src || "#"}
		download
		target="_blank"
		rel="noopener noreferrer"
		class={cn(
			"border-border bg-card hover:bg-accent flex items-center gap-3 rounded-lg border p-4 transition-colors",
			className
		)}
	>
		<div class="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
				<polyline points="7 10 12 15 17 10" />
				<line x1="12" y1="15" x2="12" y2="3" />
			</svg>
		</div>
		<div class="min-w-0 flex-1">
			{#if title}<p class="truncate font-medium">{title}</p>{/if}
			{#if description}<p class="text-muted-foreground truncate text-sm">{description}</p>{/if}
		</div>
	</a>
{/if}

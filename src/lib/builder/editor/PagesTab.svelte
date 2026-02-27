<script lang="ts">
	import { getEditorState } from "../stores/editor.svelte.js";
	import { FilePen } from "@lucide/svelte";

	const editor = getEditorState();

	let currentSlug = $derived(editor?.page.meta.slug ?? "");
	let pages = $derived(editor?.allPages ?? []);
</script>

<div class="flex flex-col gap-1 p-2">
	{#if pages.length === 0}
		<p class="text-muted-foreground px-2 py-4 text-center text-xs">No pages found</p>
	{:else}
		{#each pages as page (page.slug)}
			<a
				href="/builder/{page.slug}"
				class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors
					{page.slug === currentSlug
					? 'bg-accent text-accent-foreground'
					: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
			>
				<FilePen class="h-3.5 w-3.5 shrink-0" />
				<span class="flex-1 truncate">{page.title}</span>
				<span
					class="rounded-full px-1.5 py-0.5 text-[10px] leading-none font-medium {page.status ===
					'published'
						? 'bg-green-500/10 text-green-500'
						: 'bg-yellow-500/10 text-yellow-500'}"
				>
					{page.status === "published" ? "live" : "draft"}
				</span>
			</a>
		{/each}
	{/if}
</div>

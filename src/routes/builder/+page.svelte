<script lang="ts">
	import { FilePen, Plus } from '@lucide/svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Site Builder</title>
</svelte:head>

<div class="min-h-screen bg-background">
	<div class="mx-auto max-w-4xl px-4 py-12">
		<div class="mb-8 flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold">Site Builder</h1>
				<p class="mt-1 text-muted-foreground">Manage and edit your pages</p>
			</div>
			<a
				href="/builder/new"
				class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
			>
				<Plus class="h-4 w-4" />
				New Page
			</a>
		</div>

		{#if data.pages.length > 0}
			<div class="grid gap-4">
				{#each data.pages as page}
					<a
						href="/builder/{page.slug}"
						class="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
					>
						<div
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted"
						>
							<FilePen class="h-5 w-5 text-muted-foreground" />
						</div>
						<div class="flex-1">
							<h2 class="font-medium group-hover:text-accent-foreground">{page.title}</h2>
							<p class="text-sm text-muted-foreground">/{page.slug}</p>
						</div>
						<div class="flex items-center gap-2">
							<span
								class="rounded-full px-2 py-0.5 text-xs font-medium {page.status === 'published'
									? 'bg-green-500/10 text-green-500'
									: 'bg-yellow-500/10 text-yellow-500'}"
							>
								{page.status}
							</span>
						</div>
					</a>
				{/each}
			</div>
		{:else}
			<div class="rounded-lg border border-dashed border-border py-12 text-center">
				<p class="text-muted-foreground">No pages yet. Create your first page to get started.</p>
			</div>
		{/if}
	</div>
</div>

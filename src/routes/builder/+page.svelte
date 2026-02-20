<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { FilePen, Plus, Trash2, Copy } from '@lucide/svelte';

	let { data } = $props();

	async function deletePage(slug: string, title: string) {
		if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;

		const res = await fetch(`/api/builder/pages/${slug}`, { method: 'DELETE' });
		if (res.ok) {
			await invalidateAll();
		}
	}

	async function duplicatePage(slug: string) {
		// Fetch the original page
		const res = await fetch(`/api/builder/pages/${slug}`);
		if (!res.ok) return;
		const original = await res.json();

		// Generate a new slug
		let newSlug = `${slug}-copy`;
		let attempt = 1;
		while (data.pages.some((p) => p.slug === newSlug)) {
			attempt++;
			newSlug = `${slug}-copy-${attempt}`;
		}

		// Create the duplicate
		const createRes = await fetch('/api/builder/pages', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				title: `${original.meta.title} (Copy)`,
				slug: newSlug,
				description: original.meta.description,
				body: original.body
			})
		});

		if (createRes.ok) {
			await invalidateAll();
		}
	}
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
					<div
						class="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
					>
						<a
							href="/builder/{page.slug}"
							class="flex flex-1 items-center gap-4"
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
							<span
								class="rounded-full px-2 py-0.5 text-xs font-medium {page.status === 'published'
									? 'bg-green-500/10 text-green-500'
									: 'bg-yellow-500/10 text-yellow-500'}"
							>
								{page.status}
							</span>
						</a>

						<div class="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
							<button
								type="button"
								class="rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
								title="Duplicate"
								onclick={(e) => { e.stopPropagation(); duplicatePage(page.slug); }}
							>
								<Copy class="h-4 w-4" />
							</button>
							<button
								type="button"
								class="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
								title="Delete"
								onclick={(e) => { e.stopPropagation(); deletePage(page.slug, page.title); }}
							>
								<Trash2 class="h-4 w-4" />
							</button>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="rounded-lg border border-dashed border-border py-12 text-center">
				<p class="text-muted-foreground">No pages yet. Create your first page to get started.</p>
			</div>
		{/if}
	</div>
</div>

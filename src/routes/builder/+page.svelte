<script lang="ts">
	import { invalidateAll } from "$app/navigation";
	import { FilePen, Plus, Trash2, Copy, Settings } from "@lucide/svelte";

	let { data } = $props();

	let errorMessage: string = $state("");

	async function deletePage(slug: string, title: string) {
		if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;

		errorMessage = "";
		try {
			const res = await fetch(`/api/builder/pages/${slug}`, { method: "DELETE" });
			if (!res.ok) {
				const body = await res.json().catch(() => ({ message: "Delete failed" }));
				throw new Error(body.message || `Delete failed (${res.status})`);
			}
			await invalidateAll();
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : "Delete failed";
		}
	}

	async function duplicatePage(slug: string) {
		errorMessage = "";
		try {
			// Fetch the original page
			const res = await fetch(`/api/builder/pages/${slug}`);
			if (!res.ok) {
				const body = await res.json().catch(() => ({ message: "Failed to fetch page" }));
				throw new Error(body.message || `Failed to fetch page (${res.status})`);
			}
			const original = await res.json();

			// Generate a new slug
			let newSlug = `${slug}-copy`;
			let attempt = 1;
			while (data.pages.some((p) => p.slug === newSlug)) {
				attempt++;
				newSlug = `${slug}-copy-${attempt}`;
			}

			// Create the duplicate
			const createRes = await fetch("/api/builder/pages", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: `${original.meta.title} (Copy)`,
					slug: newSlug,
					description: original.meta.description,
					body: original.body,
				}),
			});

			if (!createRes.ok) {
				const body = await createRes.json().catch(() => ({ message: "Duplicate failed" }));
				throw new Error(body.message || `Duplicate failed (${createRes.status})`);
			}
			await invalidateAll();
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : "Duplicate failed";
		}
	}
</script>

<svelte:head>
	<title>Site Builder</title>
</svelte:head>

<div class="bg-background min-h-0 flex-1 overflow-y-auto">
	<div class="mx-auto max-w-4xl px-4 py-12">
		<div class="mb-8 flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold">Site Builder</h1>
				<p class="text-muted-foreground mt-1">Manage and edit your pages</p>
			</div>
			<div class="flex items-center gap-2">
				<a
					href="/builder/settings"
					class="border-border hover:bg-accent inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium"
				>
					<Settings class="h-4 w-4" />
					Site Settings
				</a>
				<a
					href="/builder/new"
					class="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium"
				>
					<Plus class="h-4 w-4" />
					New Page
				</a>
			</div>
		</div>

		{#if errorMessage}
			<div
				class="border-destructive/50 bg-destructive/10 text-destructive mb-4 flex items-center justify-between rounded-md border px-4 py-3 text-sm"
			>
				<span>{errorMessage}</span>
				<button
					type="button"
					class="text-destructive hover:text-destructive/80 ml-4"
					onclick={() => (errorMessage = "")}
				>
					Dismiss
				</button>
			</div>
		{/if}

		{#if data.pages.length > 0}
			<div class="grid gap-4">
				{#each data.pages as page}
					<div
						class="group border-border bg-card hover:bg-accent flex items-center gap-4 rounded-lg border p-4 transition-colors"
					>
						<a href="/builder/{page.slug}" class="flex flex-1 items-center gap-4">
							<div class="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-md">
								<FilePen class="text-muted-foreground h-5 w-5" />
							</div>
							<div class="flex-1">
								<h2 class="group-hover:text-accent-foreground font-medium">{page.title}</h2>
								<p class="text-muted-foreground text-sm">/{page.slug}</p>
							</div>
							<span
								class="rounded-full px-2 py-0.5 text-xs font-medium {page.status === 'published'
									? 'bg-green-500/10 text-green-500'
									: 'bg-yellow-500/10 text-yellow-500'}"
							>
								{page.status}
							</span>
						</a>

						<div
							class="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
						>
							<button
								type="button"
								class="text-muted-foreground hover:bg-background hover:text-foreground rounded-md p-1.5"
								title="Duplicate"
								onclick={(e) => {
									e.stopPropagation();
									duplicatePage(page.slug);
								}}
							>
								<Copy class="h-4 w-4" />
							</button>
							<button
								type="button"
								class="text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-md p-1.5"
								title="Delete"
								onclick={(e) => {
									e.stopPropagation();
									deletePage(page.slug, page.title);
								}}
							>
								<Trash2 class="h-4 w-4" />
							</button>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="border-border rounded-lg border border-dashed py-12 text-center">
				<p class="text-muted-foreground">No pages yet. Create your first page to get started.</p>
			</div>
		{/if}
	</div>
</div>

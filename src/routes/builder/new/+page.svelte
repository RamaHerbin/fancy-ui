<script lang="ts">
	import { goto } from "$app/navigation";
	import { ArrowLeft, Loader2 } from "@lucide/svelte";

	let title = $state("");
	let slug = $state("");
	let description = $state("");
	let autoSlug = $state(true);
	let submitting = $state(false);
	let errorMsg = $state("");

	function toSlug(text: string): string {
		return text
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "");
	}

	$effect(() => {
		if (autoSlug) {
			slug = toSlug(title);
		}
	});

	function handleSlugInput(e: Event) {
		autoSlug = false;
		slug = (e.currentTarget as HTMLInputElement).value;
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!title.trim() || !slug.trim()) return;

		submitting = true;
		errorMsg = "";

		try {
			const res = await fetch("/api/builder/pages", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: title.trim(),
					slug: slug.trim(),
					description: description.trim() || undefined,
				}),
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({ message: "Failed to create page" }));
				throw new Error(data.message || `Failed to create page (${res.status})`);
			}

			const data = await res.json();
			goto(`/builder/${data.slug}`);
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : "Failed to create page";
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>New Page - Site Builder</title>
</svelte:head>

<div class="bg-background min-h-0 flex-1 overflow-y-auto">
	<div class="mx-auto max-w-lg px-4 py-12">
		<a
			href="/builder"
			class="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1 text-sm"
		>
			<ArrowLeft class="h-4 w-4" />
			Back to Dashboard
		</a>

		<h1 class="mb-8 text-3xl font-bold">New Page</h1>

		<form onsubmit={handleSubmit} class="space-y-6">
			<div>
				<label for="title" class="mb-1.5 block text-sm font-medium">Title</label>
				<input
					id="title"
					type="text"
					bind:value={title}
					class="border-border bg-background focus:border-ring focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
					placeholder="My Page"
					required
				/>
			</div>

			<div>
				<label for="slug" class="mb-1.5 block text-sm font-medium">Slug</label>
				<div class="flex items-center gap-2">
					<span class="text-muted-foreground text-sm">/pages/</span>
					<input
						id="slug"
						type="text"
						value={slug}
						oninput={handleSlugInput}
						class="border-border bg-background focus:border-ring focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
						placeholder="my-page"
						pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
						required
					/>
				</div>
			</div>

			<div>
				<label for="description" class="mb-1.5 block text-sm font-medium">
					Description <span class="text-muted-foreground">(optional)</span>
				</label>
				<textarea
					id="description"
					bind:value={description}
					class="border-border bg-background focus:border-ring focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
					rows={3}
					placeholder="A brief description of this page"
				></textarea>
			</div>

			{#if errorMsg}
				<p class="text-destructive text-sm">{errorMsg}</p>
			{/if}

			<button
				type="submit"
				disabled={submitting || !title.trim() || !slug.trim()}
				class="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
			>
				{#if submitting}
					<Loader2 class="h-4 w-4 animate-spin" />
					Creating...
				{:else}
					Create Page
				{/if}
			</button>
		</form>
	</div>
</div>

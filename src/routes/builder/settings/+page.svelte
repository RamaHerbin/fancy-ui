<script lang="ts">
	import { goto } from "$app/navigation";
	import { ArrowLeft, Plus, Trash2, GripVertical } from "@lucide/svelte";
	import type { NavItem, SiteConfig } from "$lib/builder/types/site.js";

	let { data } = $props();

	let config = $state<SiteConfig>({
		...structuredClone(data.config),
		footer: structuredClone(data.config.footer) ?? { text: "", links: [] },
	});
	let saving = $state(false);
	let error = $state("");
	let success = $state("");

	function newId(): string {
		return Math.random().toString(36).slice(2, 10);
	}

	function addNavItem() {
		config.navigation = [
			...config.navigation,
			{
				id: newId(),
				label: "New Link",
				target: { type: "anchor", anchorId: "" },
			},
		];
	}

	function removeNavItem(id: string) {
		config.navigation = config.navigation.filter((item) => item.id !== id);
	}

	function updateNavTarget(item: NavItem, type: "page" | "anchor" | "url") {
		if (type === "page") {
			item.target = { type: "page", slug: data.pages[0]?.slug ?? "" };
		} else if (type === "anchor") {
			item.target = { type: "anchor", anchorId: "" };
		} else {
			item.target = { type: "url", href: "", external: false };
		}
	}

	function addFooterLink() {
		if (!config.footer) config.footer = { text: "", links: [] };
		if (!config.footer.links) config.footer.links = [];
		config.footer.links = [
			...config.footer.links,
			{
				id: newId(),
				label: "New Link",
				target: { type: "url", href: "#" },
			},
		];
	}

	function removeFooterLink(id: string) {
		if (!config.footer?.links) return;
		config.footer.links = config.footer.links.filter((item) => item.id !== id);
	}

	function getFooterLinkHref(link: NavItem): string {
		return link.target.type === "url" ? link.target.href : "#";
	}

	function setFooterLinkHref(link: NavItem, href: string) {
		link.target = { type: "url", href };
	}

	async function save() {
		saving = true;
		error = "";
		success = "";

		try {
			const res = await fetch("/api/builder/site", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(config),
			});

			if (!res.ok) {
				const body = await res.json().catch(() => ({ message: "Save failed" }));
				throw new Error(body.message || `Save failed (${res.status})`);
			}

			success = "Site settings saved.";
			setTimeout(() => (success = ""), 3000);
		} catch (err) {
			error = err instanceof Error ? err.message : "Save failed";
		} finally {
			saving = false;
		}
	}

	const inputClass =
		"border-border bg-input text-foreground placeholder:text-muted-foreground focus:ring-ring h-9 w-full rounded-md border px-3 text-sm focus:ring-2 focus:outline-none";
	const selectClass =
		"border-border bg-input text-foreground focus:ring-ring h-9 rounded-md border px-3 text-sm focus:ring-2 focus:outline-none";
</script>

<svelte:head>
	<title>Site Settings - Builder</title>
</svelte:head>

<div class="bg-background min-h-0 flex-1 overflow-y-auto">
	<div class="mx-auto max-w-3xl px-4 py-12">
		<div class="mb-8 flex items-center gap-4">
			<a href="/builder" class="text-muted-foreground hover:text-foreground rounded-md p-1.5">
				<ArrowLeft class="h-5 w-5" />
			</a>
			<div class="flex-1">
				<h1 class="text-2xl font-bold">Site Settings</h1>
				<p class="text-muted-foreground mt-1 text-sm">
					Configure navigation, footer, and page order
				</p>
			</div>
			<button
				type="button"
				class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
				onclick={save}
				disabled={saving}
			>
				{saving ? "Saving..." : "Save"}
			</button>
		</div>

		{#if error}
			<div
				class="border-destructive/50 bg-destructive/10 text-destructive mb-4 rounded-md border px-4 py-3 text-sm"
			>
				{error}
			</div>
		{/if}

		{#if success}
			<div
				class="mb-4 rounded-md border border-green-500/50 bg-green-500/10 px-4 py-3 text-sm text-green-600"
			>
				{success}
			</div>
		{/if}

		<div class="space-y-8">
			<!-- General -->
			<section class="border-border rounded-lg border p-6">
				<h2 class="mb-4 text-lg font-semibold">General</h2>
				<div class="space-y-4">
					<div>
						<label for="site-title" class="text-muted-foreground mb-1.5 block text-xs font-medium"
							>Site Title</label
						>
						<input id="site-title" type="text" class={inputClass} bind:value={config.title} />
					</div>
					<div>
						<label for="site-desc" class="text-muted-foreground mb-1.5 block text-xs font-medium"
							>Description</label
						>
						<input id="site-desc" type="text" class={inputClass} bind:value={config.description} />
					</div>
				</div>
			</section>

			<!-- Navigation -->
			<section class="border-border rounded-lg border p-6">
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-lg font-semibold">Navigation</h2>
					<button
						type="button"
						class="border-border hover:bg-accent inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium"
						onclick={addNavItem}
					>
						<Plus class="h-3 w-3" />
						Add Item
					</button>
				</div>

				{#if config.navigation.length === 0}
					<p class="text-muted-foreground text-sm">No navigation items. Add one to get started.</p>
				{:else}
					<div class="space-y-3">
						{#each config.navigation as item, i (item.id)}
							<div class="border-border flex items-start gap-2 rounded-md border p-3">
								<GripVertical class="text-muted-foreground mt-2 h-4 w-4 shrink-0" />
								<div class="flex-1 space-y-2">
									<input
										type="text"
										class={inputClass}
										placeholder="Label"
										bind:value={item.label}
									/>
									<div class="flex gap-2">
										<select
											class="{selectClass} w-28"
											value={item.target.type}
											onchange={(e) =>
												updateNavTarget(item, e.currentTarget.value as "page" | "anchor" | "url")}
										>
											<option value="anchor">Anchor</option>
											<option value="page">Page</option>
											<option value="url">URL</option>
										</select>

										{#if item.target.type === "anchor"}
											<input
												type="text"
												class="{inputClass} flex-1"
												placeholder="section-id"
												bind:value={item.target.anchorId}
											/>
										{:else if item.target.type === "page"}
											<select class="{selectClass} flex-1" bind:value={item.target.slug}>
												{#each data.pages as page}
													<option value={page.slug}>{page.title}</option>
												{/each}
											</select>
										{:else if item.target.type === "url"}
											<input
												type="text"
												class="{inputClass} flex-1"
												placeholder="https://..."
												bind:value={item.target.href}
											/>
										{/if}
									</div>
								</div>
								<button
									type="button"
									class="text-muted-foreground hover:text-destructive mt-2 rounded p-1"
									onclick={() => removeNavItem(item.id)}
								>
									<Trash2 class="h-4 w-4" />
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</section>

			<!-- Footer -->
			<section class="border-border rounded-lg border p-6">
				<h2 class="mb-4 text-lg font-semibold">Footer</h2>
				<div class="space-y-4">
					<div>
						<label for="footer-text" class="text-muted-foreground mb-1.5 block text-xs font-medium">
							Footer Text
						</label>
						<input
							id="footer-text"
							type="text"
							class={inputClass}
							placeholder="© 2024 My Site"
							bind:value={config.footer!.text}
						/>
					</div>

					<div>
						<div class="mb-2 flex items-center justify-between">
							<label class="text-muted-foreground text-xs font-medium">Footer Links</label>
							<button
								type="button"
								class="border-border hover:bg-accent inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium"
								onclick={addFooterLink}
							>
								<Plus class="h-3 w-3" />
								Add Link
							</button>
						</div>

						{#if config.footer?.links && config.footer.links.length > 0}
							<div class="space-y-2">
								{#each config.footer.links as link (link.id)}
									<div class="flex items-center gap-2">
										<input
											type="text"
											class="{inputClass} w-32"
											placeholder="Label"
											bind:value={link.label}
										/>
										<input
											type="text"
											class="{inputClass} flex-1"
											placeholder="https://..."
											value={getFooterLinkHref(link)}
											oninput={(e) => setFooterLinkHref(link, e.currentTarget.value)}
										/>
										<button
											type="button"
											class="text-muted-foreground hover:text-destructive rounded p-1"
											onclick={() => removeFooterLink(link.id)}
										>
											<Trash2 class="h-4 w-4" />
										</button>
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-muted-foreground text-sm">No footer links.</p>
						{/if}
					</div>
				</div>
			</section>

			<!-- Page Order -->
			<section class="border-border rounded-lg border p-6">
				<h2 class="mb-4 text-lg font-semibold">Page Order</h2>
				<p class="text-muted-foreground mb-3 text-sm">
					Order pages for navigation. Pages not listed here will appear at the end.
				</p>
				{#if data.pages.length > 0}
					<div class="space-y-2">
						{#each data.pages as page (page.slug)}
							<div class="border-border flex items-center gap-3 rounded-md border px-3 py-2">
								<GripVertical class="text-muted-foreground h-4 w-4 shrink-0" />
								<span class="flex-1 text-sm font-medium">{page.title}</span>
								<span class="text-muted-foreground text-xs">/{page.slug}</span>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-muted-foreground text-sm">No pages yet.</p>
				{/if}
			</section>
		</div>
	</div>
</div>

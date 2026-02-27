<script lang="ts">
	import type { LinkPropSchema, LinkValue } from "../../types/registry.js";

	interface Props {
		value: LinkValue;
		schema: LinkPropSchema;
		onchange: (value: LinkValue) => void;
	}

	let { value, schema, onchange }: Props = $props();

	let mode = $state<"url" | "page">(value?.pageSlug ? "page" : "url");
	let pages = $state<{ slug: string; title: string }[]>([]);
	let loaded = $state(false);

	async function loadPages() {
		if (loaded) return;
		try {
			const res = await fetch("/api/builder/pages");
			if (res.ok) pages = await res.json();
		} catch {
			// silently fail
		}
		loaded = true;
	}

	function update(partial: Partial<LinkValue>) {
		onchange({ ...value, ...partial });
	}

	function switchMode(newMode: "url" | "page") {
		mode = newMode;
		if (newMode === "page") {
			loadPages();
			update({ pageSlug: pages[0]?.slug ?? "", href: "" });
		} else {
			update({ pageSlug: undefined, href: value?.href ?? "#" });
		}
	}

	const inputClass =
		"border-border bg-input text-foreground placeholder:text-muted-foreground focus:ring-ring h-8 w-full rounded-md border px-2.5 text-sm focus:ring-2 focus:outline-none";
	const selectClass =
		"border-border bg-input text-foreground focus:ring-ring h-8 w-full rounded-md border px-2.5 text-sm focus:ring-2 focus:outline-none";
</script>

<div class="space-y-2">
	<div class="flex gap-1">
		<button
			type="button"
			class="rounded px-2 py-1 text-xs font-medium {mode === 'url'
				? 'bg-primary text-primary-foreground'
				: 'bg-muted text-muted-foreground'}"
			onclick={() => switchMode("url")}
		>
			URL
		</button>
		<button
			type="button"
			class="rounded px-2 py-1 text-xs font-medium {mode === 'page'
				? 'bg-primary text-primary-foreground'
				: 'bg-muted text-muted-foreground'}"
			onclick={() => {
				switchMode("page");
				loadPages();
			}}
		>
			Page
		</button>
	</div>

	{#if mode === "url"}
		<input
			type="text"
			class={inputClass}
			placeholder="https://... or #anchor"
			value={value?.href ?? ""}
			oninput={(e) => update({ href: e.currentTarget.value })}
		/>
	{:else}
		<select
			class={selectClass}
			value={value?.pageSlug ?? ""}
			onchange={(e) => update({ pageSlug: e.currentTarget.value, href: "" })}
		>
			{#if !loaded}
				<option value="">Loading...</option>
			{:else if pages.length === 0}
				<option value="">No pages found</option>
			{:else}
				{#each pages as page}
					<option value={page.slug}>{page.title}</option>
				{/each}
			{/if}
		</select>
	{/if}

	<select
		class={selectClass}
		value={value?.target ?? "_self"}
		onchange={(e) => update({ target: e.currentTarget.value as "_self" | "_blank" })}
	>
		<option value="_self">Same tab</option>
		<option value="_blank">New tab</option>
	</select>
</div>

<script lang="ts">
	import type { ClassPropSchema } from "../../types/registry.js";
	import { CLASS_SUGGESTIONS, CLASS_CATEGORIES } from "./class-suggestions.js";

	interface Props {
		value: string;
		schema: ClassPropSchema;
		onchange: (value: string) => void;
	}

	let { value, schema, onchange }: Props = $props();

	let search = $state("");
	let open = $state(false);
	let activeCategory = $state<string>("All");

	let classes = $derived(value.split(/\s+/).filter(Boolean));

	const availableCategories = $derived(
		schema.categories?.length
			? CLASS_CATEGORIES.filter((c) => schema.categories!.includes(c))
			: [...CLASS_CATEGORIES]
	);

	let filteredSuggestions = $derived.by(() => {
		let items = CLASS_SUGGESTIONS;

		// Filter by allowed categories from schema
		if (schema.categories?.length) {
			items = items.filter((s) => schema.categories!.includes(s.category));
		}

		// Filter by active category tab
		if (activeCategory !== "All") {
			items = items.filter((s) => s.category === activeCategory);
		}

		// Filter by search
		if (search.trim()) {
			const q = search.toLowerCase();
			items = items.filter(
				(s) => s.value.toLowerCase().includes(q) || s.label.toLowerCase().includes(q)
			);
		}

		// Remove already-applied classes
		items = items.filter((s) => !classes.includes(s.value));

		return items.slice(0, 30);
	});

	function addClass(cls: string) {
		const trimmed = cls.trim();
		if (!trimmed || classes.includes(trimmed)) return;
		onchange([...classes, trimmed].join(" "));
		search = "";
	}

	function removeClass(cls: string) {
		onchange(classes.filter((c) => c !== cls).join(" "));
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Enter" && search.trim()) {
			e.preventDefault();
			addClass(search);
		}
	}
</script>

<div class="space-y-2">
	<!-- Current classes as chips -->
	{#if classes.length > 0}
		<div class="flex flex-wrap gap-1">
			{#each classes as cls (cls)}
				<span
					class="bg-muted text-foreground inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs"
				>
					<code class="text-[11px]">{cls}</code>
					<button
						type="button"
						class="text-muted-foreground hover:text-destructive ml-0.5 text-xs leading-none"
						onclick={() => removeClass(cls)}
						aria-label="Remove {cls}"
					>
						&times;
					</button>
				</span>
			{/each}
		</div>
	{/if}

	<!-- Search input -->
	<div class="relative">
		<input
			type="text"
			class="border-border bg-input text-foreground placeholder:text-muted-foreground focus:ring-ring h-8 w-full rounded-md border px-2.5 text-xs focus:ring-2 focus:outline-none"
			placeholder="Search or type class..."
			bind:value={search}
			onfocus={() => (open = true)}
			onkeydown={handleKeydown}
		/>
	</div>

	<!-- Dropdown -->
	{#if open}
		<div class="bg-popover border-border rounded-md border shadow-md">
			<!-- Category tabs -->
			<div class="border-border flex gap-0.5 overflow-x-auto border-b p-1">
				<button
					type="button"
					class="shrink-0 rounded px-2 py-1 text-[10px] font-medium {activeCategory === 'All'
						? 'bg-accent text-accent-foreground'
						: 'text-muted-foreground hover:text-foreground'}"
					onclick={() => (activeCategory = "All")}
				>
					All
				</button>
				{#each availableCategories as cat}
					<button
						type="button"
						class="shrink-0 rounded px-2 py-1 text-[10px] font-medium {activeCategory === cat
							? 'bg-accent text-accent-foreground'
							: 'text-muted-foreground hover:text-foreground'}"
						onclick={() => (activeCategory = cat)}
					>
						{cat}
					</button>
				{/each}
			</div>

			<!-- Suggestions list -->
			<div class="max-h-40 overflow-y-auto p-1">
				{#each filteredSuggestions as suggestion (suggestion.value)}
					<button
						type="button"
						class="hover:bg-accent flex w-full items-center justify-between rounded px-2 py-1.5 text-xs"
						onclick={() => addClass(suggestion.value)}
					>
						<code class="text-foreground text-[11px]">{suggestion.value}</code>
						<span class="text-muted-foreground ml-2 truncate text-[10px]">
							{suggestion.label}
						</span>
					</button>
				{/each}
				{#if filteredSuggestions.length === 0}
					<p class="text-muted-foreground px-2 py-2 text-xs">
						{search.trim() ? "Press Enter to add custom class" : "No suggestions"}
					</p>
				{/if}
			</div>
		</div>
	{/if}
</div>

<!-- Close dropdown when clicking outside -->
<svelte:window
	onclick={(e) => {
		const target = e.target as HTMLElement;
		if (!target.closest(".space-y-2")) {
			open = false;
		}
	}}
/>

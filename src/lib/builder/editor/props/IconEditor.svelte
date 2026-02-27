<script lang="ts">
	import type { IconPropSchema } from "../../types/registry.js";
	import type { Component } from "svelte";
	import * as icons from "@lucide/svelte";

	interface Props {
		value: string;
		schema: IconPropSchema;
		onchange: (value: string) => void;
	}

	let { value, schema, onchange }: Props = $props();

	let search = $state("");
	let open = $state(false);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const iconMap = icons as unknown as Record<string, Component<any>>;

	const allIconNames = Object.keys(icons).filter(
		(k) =>
			k !== "default" && k !== "createLucideIcon" && k !== "icons" && k[0] === k[0].toUpperCase()
	);

	let filtered = $derived(
		search.trim()
			? allIconNames.filter((n) => n.toLowerCase().includes(search.toLowerCase())).slice(0, 50)
			: allIconNames.slice(0, 50)
	);

	let CurrentIcon = $derived(value ? (iconMap[value] ?? null) : null);

	function select(name: string) {
		onchange(name);
		open = false;
		search = "";
	}
</script>

<div class="relative">
	<button
		type="button"
		class="border-border bg-input text-foreground flex h-9 w-full items-center gap-2 rounded-md border px-3 text-sm"
		onclick={() => (open = !open)}
	>
		{#if CurrentIcon}
			<CurrentIcon size={16} />
		{/if}
		<span class="flex-1 truncate text-left">{value || "Select icon..."}</span>
	</button>

	{#if open}
		<div class="bg-popover border-border absolute z-50 mt-1 w-full rounded-md border shadow-md">
			<div class="p-2">
				<input
					type="text"
					class="border-border bg-input text-foreground placeholder:text-muted-foreground focus:ring-ring h-8 w-full rounded-md border px-2.5 text-sm focus:ring-2 focus:outline-none"
					placeholder="Search icons..."
					bind:value={search}
				/>
			</div>
			<div class="max-h-48 overflow-y-auto p-1">
				{#if value}
					<button
						type="button"
						class="text-muted-foreground hover:bg-accent flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs"
						onclick={() => select("")}
					>
						None
					</button>
				{/if}
				{#each filtered as iconName (iconName)}
					{@const Icon = iconMap[iconName]}
					<button
						type="button"
						class="hover:bg-accent flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs
							{iconName === value ? 'bg-accent' : ''}"
						onclick={() => select(iconName)}
					>
						{#if Icon}
							<Icon size={14} />
						{/if}
						<span class="truncate">{iconName}</span>
					</button>
				{/each}
				{#if filtered.length === 0}
					<p class="text-muted-foreground px-2 py-2 text-xs">No icons found</p>
				{/if}
			</div>
		</div>
	{/if}
</div>

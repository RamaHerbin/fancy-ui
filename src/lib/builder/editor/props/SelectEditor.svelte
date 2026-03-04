<script lang="ts">
	import type { SelectPropSchema } from "../../types/registry.js";
	import type { Component } from "svelte";
	import * as icons from "@lucide/svelte";

	interface Props {
		value: string;
		schema: SelectPropSchema;
		onchange: (value: string) => void;
	}

	let { value, schema, onchange }: Props = $props();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const iconMap = icons as unknown as Record<string, Component<any>>;

	function getIcon(name?: string): Component<{ size?: number }> | null {
		if (!name) return null;
		return iconMap[name] ?? null;
	}
</script>

{#if schema.display === "icon-buttons"}
	<div class="flex gap-1">
		{#each schema.options as opt (opt.value)}
			{@const Icon = getIcon(opt.icon)}
			<button
				type="button"
				class="border-border flex h-8 flex-1 items-center justify-center rounded-md border transition-colors
					{opt.value === value
					? 'bg-accent text-accent-foreground border-accent'
					: 'bg-input text-muted-foreground hover:text-foreground hover:bg-muted'}"
				title={opt.label}
				onclick={() => onchange(opt.value)}
			>
				{#if Icon}
					<Icon size={16} />
				{:else}
					<span class="text-[10px]">{opt.label}</span>
				{/if}
			</button>
		{/each}
	</div>
{:else}
	<select
		class="border-border bg-input text-foreground focus:ring-ring h-9 w-full rounded-md border px-3 text-sm focus:ring-2 focus:outline-none"
		{value}
		onchange={(e) => onchange(e.currentTarget.value)}
	>
		{#each schema.options as opt}
			<option value={opt.value} selected={opt.value === value}>{opt.label}</option>
		{/each}
	</select>
{/if}

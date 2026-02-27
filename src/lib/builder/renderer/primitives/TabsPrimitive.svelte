<script lang="ts">
	import { cn } from "$lib/utils";
	import { setContext } from "svelte";
	import type { Snippet } from "svelte";

	interface TabInfo {
		value: string;
		label: string;
	}

	interface Props {
		defaultTab?: string;
		class?: string;
		children?: Snippet;
	}

	let { defaultTab = "", class: className = "", children }: Props = $props();

	let tabs = $state<TabInfo[]>([]);
	let activeTab = $state(defaultTab);

	function registerTab(info: TabInfo) {
		tabs = [...tabs.filter((t) => t.value !== info.value), info];
		if (!activeTab && tabs.length > 0) {
			activeTab = tabs[0].value;
		}
	}

	setContext("builder:tabs", {
		get activeTab() {
			return activeTab;
		},
		registerTab,
	});

	// If defaultTab is set and valid, use it
	$effect(() => {
		if (defaultTab && tabs.some((t) => t.value === defaultTab)) {
			activeTab = defaultTab;
		} else if (tabs.length > 0 && !tabs.some((t) => t.value === activeTab)) {
			activeTab = tabs[0].value;
		}
	});
</script>

<div class={cn("flex flex-col gap-2", className)}>
	{#if tabs.length > 0}
		<div
			class="bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]"
		>
			{#each tabs as tab (tab.value)}
				<button
					type="button"
					class={cn(
						"inline-flex h-[calc(100%-1px)] items-center justify-center rounded-md border border-transparent px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors",
						activeTab === tab.value
							? "bg-background text-foreground shadow-sm"
							: "hover:text-foreground"
					)}
					onclick={() => (activeTab = tab.value)}
				>
					{tab.label}
				</button>
			{/each}
		</div>
	{/if}

	{#if children}
		{@render children()}
	{/if}
</div>

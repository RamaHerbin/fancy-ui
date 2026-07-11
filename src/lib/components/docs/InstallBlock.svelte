<script lang="ts">
	import { t } from "$lib/stores";

	interface Props {
		packageName?: string;
		componentImport?: string;
	}

	let { packageName = "fancy-ui-svelte", componentImport = "" }: Props = $props();

	let activeTab = $state<"pnpm" | "npm" | "bun">("pnpm");
	let copied = $state(false);

	const commands = $derived({
		pnpm: `pnpm add ${packageName}`,
		npm: `npm install ${packageName}`,
		bun: `bun add ${packageName}`,
	});

	async function copyCommand() {
		await navigator.clipboard.writeText(commands[activeTab]);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="rounded-lg border border-(--code-border) bg-(--code-bg)">
	<!-- Tabs -->
	<div class="flex border-b border-(--code-border)">
		{#each ["pnpm", "npm", "bun"] as const as tab}
			<button
				onclick={() => (activeTab = tab)}
				class="px-4 py-2 text-xs font-medium transition-colors {activeTab === tab
					? 'border-b-2 border-(--code-fg) text-(--code-fg)'
					: 'text-(--code-fg-muted) hover:text-(--code-fg)'}"
			>
				{tab}
			</button>
		{/each}
		<div class="flex flex-1 justify-end p-1.5">
			<button
				onclick={copyCommand}
				class="rounded px-2 py-1 text-xs text-(--code-fg-muted) transition-colors hover:bg-(--code-chip-bg) hover:text-(--code-fg)"
			>
				{copied ? t("action.copied") : t("action.copy")}
			</button>
		</div>
	</div>
	<!-- Command -->
	<div class="p-4 font-mono text-sm text-(--code-cmd)">
		{commands[activeTab]}
	</div>
	<!-- Import -->
	{#if componentImport}
		<div class="border-t border-(--code-border) p-4 font-mono text-sm">
			<span class="text-(--code-kw)">import</span>
			<span class="text-(--code-fg)"> {componentImport} </span>
			<span class="text-(--code-kw)">from</span>
			<span class="text-(--code-str)"> '{packageName}'</span>
		</div>
	{/if}
</div>

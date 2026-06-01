<script lang="ts">
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

<div class="rounded-lg border border-white/10 bg-[#0d1117]">
	<!-- Tabs -->
	<div class="flex border-b border-white/10">
		{#each ["pnpm", "npm", "bun"] as const as tab}
			<button
				onclick={() => (activeTab = tab)}
				class="px-4 py-2 text-xs font-medium transition-colors {activeTab === tab
					? 'border-b-2 border-white/60 text-white'
					: 'text-white/40 hover:text-white/60'}"
			>
				{tab}
			</button>
		{/each}
		<div class="flex flex-1 justify-end p-1.5">
			<button
				onclick={copyCommand}
				class="rounded px-2 py-1 text-xs text-white/40 transition-colors hover:bg-white/10 hover:text-white"
			>
				{copied ? "Copied!" : "Copy"}
			</button>
		</div>
	</div>
	<!-- Command -->
	<div class="p-4 font-mono text-sm text-emerald-400">
		{commands[activeTab]}
	</div>
	<!-- Import -->
	{#if componentImport}
		<div class="border-t border-white/10 p-4 font-mono text-sm">
			<span class="text-purple-400">import</span>
			<span class="text-white"> {componentImport} </span>
			<span class="text-purple-400">from</span>
			<span class="text-amber-300"> '{packageName}'</span>
		</div>
	{/if}
</div>

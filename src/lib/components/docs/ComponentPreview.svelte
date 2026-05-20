<script lang="ts">
	import type { Snippet } from "svelte";
	import CodeBlock from "./CodeBlock.svelte";

	interface Props {
		code?: string;
		title?: string;
		preview: Snippet;
	}

	let { code = "", title = "", preview }: Props = $props();

	let activeTab = $state<"preview" | "code">("preview");
</script>

<div class="border-border overflow-hidden rounded-lg border">
	{#if title}
		<div class="border-border text-foreground border-b px-4 py-2 text-sm font-medium">
			{title}
		</div>
	{/if}
	<!-- Tabs -->
	<div class="border-border flex border-b">
		<button
			onclick={() => (activeTab = "preview")}
			class="px-4 py-2 text-sm font-medium transition-colors {activeTab === 'preview'
				? 'border-foreground text-foreground border-b-2'
				: 'text-muted-foreground hover:text-foreground'}"
		>
			Preview
		</button>
		{#if code}
			<button
				onclick={() => (activeTab = "code")}
				class="px-4 py-2 text-sm font-medium transition-colors {activeTab === 'code'
					? 'border-foreground text-foreground border-b-2'
					: 'text-muted-foreground hover:text-foreground'}"
			>
				Code
			</button>
		{/if}
	</div>

	<!-- Content -->
	{#if activeTab === "preview"}
		<div class="bg-background flex min-h-[200px] items-center justify-center p-8">
			{@render preview()}
		</div>
	{:else if code}
		<div class="max-h-[500px] overflow-auto">
			<CodeBlock {code} />
		</div>
	{/if}
</div>

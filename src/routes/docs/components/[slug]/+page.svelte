<script lang="ts">
	import { categoryLabels } from "$lib/fancy-ui/registry.js";
	import PropsTable from "$lib/components/docs/PropsTable.svelte";
	import InstallBlock from "$lib/components/docs/InstallBlock.svelte";
	import CodeBlock from "$lib/components/docs/CodeBlock.svelte";
	import DemoRenderer from "$lib/components/docs/DemoRenderer.svelte";
	import ExamplesSection from "$lib/components/docs/ExamplesSection.svelte";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	let component = $derived(data.component);
	let sourceUrl = $derived(
		`https://github.com/ramaherbin/fancy-ui/tree/main/src/lib/fancy-ui/${component.slug}`
	);
	let basicUsageCode = $derived(`<script lang="ts">
  import { ${component.name} } from 'fancy-ui-svelte';
<\/script>

<${component.name} />`);

	let previewTab = $state<"preview" | "code">("preview");
</script>

<svelte:head>
	<title>{component.name} - FancyUI Docs</title>
	<meta name="description" content={component.description} />
</svelte:head>

<div class="max-w-4xl">
	<!-- Header -->
	<div class="mb-3 flex flex-wrap items-center gap-2">
		<span class="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-medium">
			{categoryLabels[component.category]}
		</span>
		{#if component.status === "done"}
			<span
				class="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400"
			>
				Stable
			</span>
		{/if}
	</div>

	<h1 class="text-foreground mb-2 text-3xl font-bold" id="overview">{component.name}</h1>
	<p class="text-muted-foreground mb-6">{component.description}</p>

	<!-- ═══ PREVIEW (like Sigma UI) ═══ -->
	<section class="mb-10">
		<h2 class="text-foreground mb-4 text-xl font-semibold" id="preview">Preview</h2>
		<div class="border-border overflow-hidden rounded-lg border">
			<!-- Tabs -->
			<div class="border-border flex items-center justify-between border-b px-1">
				<div class="flex">
					<button
						onclick={() => (previewTab = "preview")}
						class="px-4 py-2.5 text-sm font-medium transition-colors {previewTab === 'preview'
							? 'border-foreground text-foreground border-b-2'
							: 'text-muted-foreground hover:text-foreground'}"
					>
						Preview
					</button>
					<button
						onclick={() => (previewTab = "code")}
						class="px-4 py-2.5 text-sm font-medium transition-colors {previewTab === 'code'
							? 'border-foreground text-foreground border-b-2'
							: 'text-muted-foreground hover:text-foreground'}"
					>
						Code
					</button>
				</div>
			</div>

			<!-- Content -->
			{#if previewTab === "preview"}
				<div
					class="bg-background relative flex min-h-[300px] items-center justify-center overflow-hidden p-8"
				>
					<DemoRenderer slug={component.slug} />
				</div>
			{:else}
				<div class="max-h-[500px] overflow-auto">
					<CodeBlock code={basicUsageCode} lang="svelte" />
				</div>
			{/if}
		</div>
	</section>

	<!-- ═══ INSTALLATION ═══ -->
	<section class="mb-10">
		<h2 class="text-foreground mb-4 text-xl font-semibold" id="installation">Installation</h2>
		<InstallBlock componentImport={"{ " + component.name + " }"} />
	</section>

	<!-- ═══ USAGE ═══ -->
	<section class="mb-10">
		<h2 class="text-foreground mb-4 text-xl font-semibold" id="usage">Usage</h2>
		<CodeBlock code={basicUsageCode} lang="svelte" />
	</section>

	<!-- ═══ EXAMPLES ═══ -->
	<ExamplesSection slug={component.slug} />

	<!-- ═══ PROPS ═══ -->
	{#if component.props && component.props.length > 0}
		<section class="mb-10">
			<h2 class="text-foreground mb-4 text-xl font-semibold" id="props">Props</h2>
			<div class="border-border overflow-hidden rounded-lg border">
				<PropsTable props={component.props} />
			</div>
		</section>
	{/if}

	<!-- ═══ SLOTS ═══ -->
	{#if component.slots && component.slots.length > 0}
		<section class="mb-10">
			<h2 class="text-foreground mb-4 text-xl font-semibold" id="slots">Slots</h2>
			<div class="border-border overflow-hidden rounded-lg border">
				<table class="w-full text-left text-sm">
					<thead>
						<tr class="border-border border-b">
							<th class="text-foreground px-4 py-3 font-semibold">Slot</th>
							<th class="text-foreground px-4 py-3 font-semibold">Description</th>
						</tr>
					</thead>
					<tbody>
						{#each component.slots as slot}
							<tr class="border-border border-b last:border-0">
								<td class="px-4 py-3">
									<code
										class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs font-medium text-purple-600 dark:text-purple-400"
									>
										{slot.name}
									</code>
								</td>
								<td class="text-muted-foreground px-4 py-3 text-xs">{slot.description}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}

	<!-- ═══ LINKS ═══ -->
	<section class="mb-10">
		<h2 class="text-foreground mb-4 text-xl font-semibold" id="links">Links</h2>
		<div class="flex flex-wrap gap-3">
			<a
				href={sourceUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="border-border text-foreground hover:bg-accent inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
					<path
						d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"
					/>
				</svg>
				Source Code
			</a>
			{#if component.credits && component.credits.length > 0}
				{#each component.credits as credit}
					{#if credit.url}
						<a
							href={credit.url}
							target="_blank"
							rel="noopener noreferrer"
							class="border-border text-foreground hover:bg-accent inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors"
						>
							Inspired by {credit.source}
						</a>
					{/if}
				{/each}
			{/if}
		</div>
	</section>
</div>

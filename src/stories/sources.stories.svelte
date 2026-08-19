<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Sources, SourcesTrigger, SourcesList, SourceCard } from "$lib/fancy-ui/sources";
	import type { SourceData } from "$lib/fancy-ui/_internals/ai-types.js";

	const sources: SourceData[] = [
		{
			id: "s1",
			title: "Designing citation surfaces for generated answers",
			url: "https://docs.example.dev/patterns/citations",
			domain: "docs.example.dev",
			snippet: "A citation is a promise that the answer can be checked, not a footnote.",
		},
		{
			id: "s2",
			title: "Retrieval quality and the illusion of grounding",
			url: "https://research.example.org/papers/grounding",
			domain: "research.example.org",
			snippet: "Four plausible sources under a wrong answer make it read as a right one.",
		},
		{
			id: "s3",
			title: "Why readers glance at sources instead of opening them",
			url: "https://notes.example.net/reading-citations",
			domain: "notes.example.net",
			snippet: "The host name does most of the work; the title does the rest.",
		},
		{
			id: "s4",
			title: "A field guide to attribution in assistant answers",
			url: "https://handbook.example.io/attribution",
			domain: "handbook.example.io",
			snippet: "Say where it came from before anyone has to ask.",
		},
	];

	const { Story } = defineMeta({
		title: "AI Chat/Sources",
		component: Sources,
		tags: ["autodocs"],
		args: { sources, open: false },
		argTypes: {
			sources: { control: "object", description: "The documents backing the answer" },
			open: { control: "boolean", description: "Whether the list is expanded" },
		},
	});
</script>

{#snippet template(args: any)}
	<div class="max-w-xl p-6">
		<Sources {...args} />
	</div>
{/snippet}

{#snippet composed(args: any)}
	<div class="max-w-xl p-6">
		<Sources {...args}>
			<SourcesTrigger label="Checked against 4 papers" />
			<SourcesList>
				{#snippet item(source: SourceData, index: number)}
					<div class="flex items-baseline gap-2 text-xs">
						<span class="text-muted-foreground tabular-nums">{index + 1}.</span>
						<a
							href={source.url}
							target="_blank"
							rel="noopener noreferrer nofollow ugc"
							class="underline underline-offset-2"
						>
							{source.title}
						</a>
					</div>
				{/snippet}
			</SourcesList>
		</Sources>
	</div>
{/snippet}

{#snippet standalone()}
	<div class="grid max-w-xl gap-2 p-6 sm:grid-cols-2">
		{#each sources.slice(0, 2) as source (source.id)}
			<SourceCard {source} />
		{/each}
	</div>
{/snippet}

<Story name="Collapsed" {template} />

<Story name="Open" {template} args={{ open: true }} />

<Story name="Single" {template} args={{ sources: sources.slice(0, 1), open: true }} />

<Story name="CustomItem" template={composed} args={{ open: true }} />

<Story name="CardStandalone" template={standalone} />

<script lang="ts">
	import { t } from "$lib/stores";
	import CodeBlock from "$lib/components/docs/CodeBlock.svelte";
	import {
		COPY_SOURCE_LEAD,
		COPY_SOURCE_SECTIONS,
		EXCLUSIONS_INTRO,
		EXCLUSIONS_TITLE,
		FRAMEWORK_LABELS,
		FRAMEWORK_ORDER,
		INDEXES_INTRO,
		INDEXES_TITLE,
		REGISTRY_INDEXES,
		type GuideBlock,
	} from "$lib/docs/copy-source-guide.js";
	import type { CopyFramework } from "$lib/copy-source.js";

	interface Props {
		exclusions: Record<CopyFramework, { label: string; reason: string }[]>;
	}

	let { exclusions }: Props = $props();

	/** `code` and **bold** spans of a guide string. */
	function spans(text: string): { kind: "text" | "code" | "strong"; text: string }[] {
		return text
			.split(/(`[^`]+`|\*\*[^*]+\*\*)/)
			.filter(Boolean)
			.map((part) =>
				part.startsWith("`")
					? { kind: "code" as const, text: part.slice(1, -1) }
					: part.startsWith("**")
						? { kind: "strong" as const, text: part.slice(2, -2) }
						: { kind: "text" as const, text: part }
			);
	}
</script>

{#snippet inline(text: string)}
	{#each spans(text) as span, i (i)}
		{#if span.kind === "code"}<code>{span.text}</code>{:else if span.kind === "strong"}<strong
				>{span.text}</strong
			>{:else}{span.text}{/if}
	{/each}
{/snippet}

{#snippet blocks(list: GuideBlock[])}
	{#each list as block, i (i)}
		{#if block.kind === "p"}
			<p>{@render inline(block.text)}</p>
		{:else if block.kind === "list"}
			<ul>
				{#each block.items as item, j (j)}
					<li>{@render inline(item)}</li>
				{/each}
			</ul>
		{:else}
			<CodeBlock lang={block.lang} code={block.code} />
		{/if}
	{/each}
{/snippet}

<h1>{t("install.copySource")}</h1>
<p class="lead">{COPY_SOURCE_LEAD}</p>

{#each COPY_SOURCE_SECTIONS as section (section.id)}
	<section>
		<h2 id={section.id}>{section.title}</h2>
		{@render blocks(section.blocks)}
		{#if section.perFramework}
			{#each FRAMEWORK_ORDER as fw (fw)}
				<h3>{FRAMEWORK_LABELS[fw]}</h3>
				{@render blocks(section.perFramework[fw])}
			{/each}
		{/if}
	</section>
{/each}

<section>
	<h2 id="not-included">{EXCLUSIONS_TITLE}</h2>
	<p>{EXCLUSIONS_INTRO}</p>
	{#each FRAMEWORK_ORDER as fw (fw)}
		<h3>{FRAMEWORK_LABELS[fw]}</h3>
		<ul>
			{#each exclusions[fw] as rule (rule.label)}
				<li><strong>{rule.label}</strong>{": "}{rule.reason}</li>
			{/each}
		</ul>
	{/each}
</section>

<section>
	<h2 id="indexes">{INDEXES_TITLE}</h2>
	<p>{INDEXES_INTRO}</p>
	<ul>
		{#each FRAMEWORK_ORDER as fw (fw)}
			<li>{FRAMEWORK_LABELS[fw]}{": "}<a href={REGISTRY_INDEXES[fw]}>{REGISTRY_INDEXES[fw]}</a></li>
		{/each}
	</ul>
</section>

<style>
	.lead {
		font-size: 1.125rem;
		color: var(--muted-foreground);
	}
</style>

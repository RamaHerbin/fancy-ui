<!--
  Adapter for BentoGridItem component.
  BentoGridItem uses `header`, `icon`, `title`, `description` snippets.
  In the builder, we use simple string props instead.
-->
<script lang="ts">
	import { BentoGridItem } from '$lib/fancy-ui/bento-grid/index.js';

	interface Props {
		headerText?: string;
		titleText?: string;
		descriptionText?: string;
		class?: string;
	}

	let {
		headerText = '',
		titleText = 'Title',
		descriptionText = 'Description',
		class: className = ''
	}: Props = $props();
</script>

{#snippet header()}
	{#if headerText}
		<div class="flex h-full min-h-24 items-center justify-center rounded-xl bg-gradient-to-br from-neutral-200 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800">
			<span class="text-sm text-muted-foreground">{headerText}</span>
		</div>
	{/if}
{/snippet}

{#snippet title()}
	{titleText}
{/snippet}

{#snippet description()}
	{descriptionText}
{/snippet}

<BentoGridItem class={className} {header} {title} {description} />

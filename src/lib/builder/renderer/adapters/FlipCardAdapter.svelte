<!--
  Adapter for FlipCard component.
  FlipCard uses `children` (front) and `back` snippets.
  In the builder, we use `frontText` and `backText` string props instead.
-->
<script lang="ts">
	import { FlipCard } from '$lib/fancy-ui/flip-card/index.js';

	interface Props {
		rotate?: 'x' | 'y';
		frontText?: string;
		backText?: string;
		class?: string;
	}

	let {
		rotate = 'y',
		frontText = 'Front',
		backText = 'Back',
		class: className = ''
	}: Props = $props();
</script>

{#snippet front()}
	<div class="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 p-4">
		<p class="text-lg font-semibold">{frontText}</p>
	</div>
{/snippet}

{#snippet back()}
	<div class="flex h-full w-full items-center justify-center p-4">
		<p class="text-sm">{backText}</p>
	</div>
{/snippet}

<FlipCard {rotate} class={className} {back}>
	{@render front()}
</FlipCard>

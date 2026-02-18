<!--
  Adapter for ContainerScroll component.
  ContainerScroll uses `titleContent` and `cardContent` snippets.
  In the builder, we use simple string props instead.
-->
<script lang="ts">
	import { ContainerScroll } from '$lib/fancy-ui/container-scroll/index.js';

	interface Props {
		titleText?: string;
		subtitleText?: string;
		imageSrc?: string;
		imageAlt?: string;
		class?: string;
	}

	let {
		titleText = 'Scroll Animation',
		subtitleText = 'Powered by FancyUI',
		imageSrc = '',
		imageAlt = 'Preview',
		class: className = ''
	}: Props = $props();
</script>

{#snippet titleContent()}
	<div>
		<h2 class="text-4xl font-semibold text-foreground">{titleText}</h2>
		{#if subtitleText}
			<p class="mt-2 text-muted-foreground">{subtitleText}</p>
		{/if}
	</div>
{/snippet}

{#snippet cardContent()}
	{#if imageSrc}
		<img src={imageSrc} alt={imageAlt} class="mx-auto h-full w-full rounded-2xl object-cover" />
	{:else}
		<div class="flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
			<p class="text-lg text-muted-foreground">Card Content</p>
		</div>
	{/if}
{/snippet}

<ContainerScroll class={className} {titleContent} {cardContent} />

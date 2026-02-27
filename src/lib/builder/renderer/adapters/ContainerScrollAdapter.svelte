<!--
  Adapter for ContainerScroll component.
  ContainerScroll uses `titleContent` and `cardContent` snippets.
  In the builder, we use simple string props instead.
-->
<script lang="ts">
	import { ContainerScroll } from "$lib/fancy-ui/container-scroll/index.js";

	interface Props {
		titleText?: string;
		subtitleText?: string;
		imageSrc?: string;
		imageAlt?: string;
		class?: string;
	}

	let {
		titleText = "Scroll Animation",
		subtitleText = "Powered by FancyUI",
		imageSrc = "",
		imageAlt = "Preview",
		class: className = "",
	}: Props = $props();
</script>

{#snippet titleContent()}
	<div>
		<h2 class="text-foreground text-4xl font-semibold">{titleText}</h2>
		{#if subtitleText}
			<p class="text-muted-foreground mt-2">{subtitleText}</p>
		{/if}
	</div>
{/snippet}

{#snippet cardContent()}
	{#if imageSrc}
		<img src={imageSrc} alt={imageAlt} class="mx-auto h-full w-full rounded-2xl object-cover" />
	{:else}
		<div
			class="from-primary/20 to-primary/5 flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br"
		>
			<p class="text-muted-foreground text-lg">Card Content</p>
		</div>
	{/if}
{/snippet}

<ContainerScroll class={className} {titleContent} {cardContent} />

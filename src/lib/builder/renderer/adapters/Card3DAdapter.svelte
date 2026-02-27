<!--
  Adapter for Card3D (CardContainer + CardBody + CardItem).
  Composes the three Card3D sub-components with builder-friendly string props.
-->
<script lang="ts">
	import { CardContainer, CardBody, CardItem } from '$lib/fancy-ui/card-3d/index.js';

	interface Props {
		title?: string;
		description?: string;
		class?: string;
		[key: string]: unknown;
	}

	let {
		title = '3D Card',
		description = 'Hover to see the 3D effect',
		class: className
	}: Props = $props();
</script>

<CardContainer class={className}>
	<CardBody class="relative flex h-auto w-auto flex-col items-center justify-center rounded-xl border border-border bg-card p-6">
		<CardItem translateZ={50} class="text-xl font-bold text-foreground">
			{title}
		</CardItem>
		<CardItem translateZ={30} class="mt-2 text-sm text-muted-foreground">
			{description}
		</CardItem>
	</CardBody>
</CardContainer>

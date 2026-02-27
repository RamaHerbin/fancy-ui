<!--
  Adapter for DirectionAwareHover.
  DirectionAwareHover uses a `children` snippet for overlay content.
  The builder uses `text` and `imageUrl` props instead.
-->
<script lang="ts">
	import { DirectionAwareHover } from '$lib/fancy-ui/direction-aware-hover/index.js';

	interface Props {
		text?: string;
		imageUrl?: string;
		class?: string;
		[key: string]: unknown;
	}

	let {
		text = 'Hover me',
		imageUrl = 'https://picsum.photos/400/400',
		class: className,
		...restProps
	}: Props = $props();
</script>

<DirectionAwareHover {imageUrl} class={className} {...restProps}>
	<p class="text-xl font-bold">{text}</p>
</DirectionAwareHover>

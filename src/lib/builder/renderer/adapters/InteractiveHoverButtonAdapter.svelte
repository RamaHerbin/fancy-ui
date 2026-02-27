<!--
  Adapter for InteractiveHoverButton.
  InteractiveHoverButton uses a `children` snippet for content.
  The builder uses a `text` prop instead.
-->
<script lang="ts">
	import { InteractiveHoverButton } from '$lib/fancy-ui/interactive-hover-button/index.js';

	interface Props {
		text?: string;
		class?: string;
		[key: string]: unknown;
	}

	let { text = 'Button', class: className, ...restProps }: Props = $props();
</script>

<InteractiveHoverButton {text} class={className} {...restProps} />

<!--
  Adapter for RainbowButton.
  RainbowButton uses a `children` snippet for content.
  The builder uses a `text` prop instead.
-->
<script lang="ts">
	import { RainbowButton } from "$lib/fancy-ui/rainbow-button/index.js";

	interface Props {
		text?: string;
		speed?: number;
		class?: string;
		[key: string]: unknown;
	}

	let { text = "Click me", speed, class: className, ...restProps }: Props = $props();
</script>

<RainbowButton {speed} class={className} {...restProps}>
	<span>{text}</span>
</RainbowButton>

<script lang="ts">
	import type { PlaygroundValues } from "$lib/inspiration/types.js";
	import { RippleButton } from "$lib/fancy-ui/ripple-button";

	let { values }: { values: PlaygroundValues } = $props();
</script>

<div class="flex h-full w-full items-center justify-center p-6">
	<RippleButton
		data-capture="click"
		data-capture-wait="180"
		sound
		rippleColor={values.rippleColor as string}
		duration={values.duration as number}
	>
		Click me
	</RippleButton>
</div>

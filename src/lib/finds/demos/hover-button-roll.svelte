<script lang="ts">
	import type { PlaygroundValues } from "$lib/finds/types.js";
	import { InteractiveHoverButton } from "$lib/fancy-ui/interactive-hover-button";

	let { values }: { values: PlaygroundValues } = $props();
</script>

<div class="flex h-full w-full items-center justify-center p-6">
	<InteractiveHoverButton sound text={values.text as string} />
</div>

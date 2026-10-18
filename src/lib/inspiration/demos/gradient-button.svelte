<script lang="ts">
	import type { PlaygroundValues } from "$lib/inspiration/types.js";
	import { GradientButton } from "$lib/fancy-ui/gradient-button";

	let { values }: { values: PlaygroundValues } = $props();
</script>

<div class="flex h-full w-full items-center justify-center p-6">
	<GradientButton
		duration={values.duration as number}
		blur={values.blur as number}
		class="text-sm font-medium"
	>
		Generate
	</GradientButton>
</div>

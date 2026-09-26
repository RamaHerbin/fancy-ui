<script lang="ts">
	import type { PlaygroundValues } from "$lib/finds/types.js";
	import { Pressable } from "$lib/fancy-ui/pressable";
	import type { HapticPattern } from "$lib/fancy-ui/_internals/motion/types.js";

	let { values }: { values: PlaygroundValues } = $props();

	let haptic = $derived(values.haptic === "none" ? false : (values.haptic as HapticPattern));
</script>

<div class="flex h-full w-full items-center justify-center p-6">
	<Pressable scale={values.scale as number} {haptic}>
		<button
			type="button"
			class="border-border bg-card text-foreground rounded-full border px-4 py-2 text-sm font-medium"
		>
			Add to cart
		</button>
	</Pressable>
</div>

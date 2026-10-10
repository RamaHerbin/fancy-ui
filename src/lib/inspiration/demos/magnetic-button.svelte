<script lang="ts">
	import type { PlaygroundValues } from "$lib/inspiration/types.js";
	import { Magnetic } from "$lib/fancy-ui/magnetic";
	import { Button } from "$lib/fancy-ui/button";

	let { values }: { values: PlaygroundValues } = $props();
</script>

<div class="flex h-full w-full items-center justify-center p-6">
	<!-- The dashed ghost marks the resting position, so the pull reads as travel. -->
	<div class="relative">
		<span
			aria-hidden="true"
			class="border-foreground/30 absolute inset-0 rounded-[10px] border border-dashed"
		></span>
		<Magnetic
			strength={values.strength as number}
			radius={values.radius as number}
			max={values.max as number}
		>
			<Button variant="outline" size="lg">Get in touch</Button>
		</Magnetic>
	</div>
</div>
